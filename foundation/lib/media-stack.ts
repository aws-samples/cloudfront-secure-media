import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { SecureDistribution, AuthMode } from './constructs/secure-distribution';
import { TokenVendingApi } from './constructs/token-vending-api';

export interface MediaStackProps extends cdk.StackProps {
  authMode: AuthMode;
  /** User pool — its ID feeds the edge validator; the pool itself guards the token API. */
  userPool: cognito.IUserPool;
  /** Region the Cognito user pool lives in (for the issuer URL). */
  authRegion: string;
}

// Single source of truth for the Lambda@Edge SSM config: the edge asset's own
// config.js. Importing it here guarantees the parameter name/region used to CREATE
// the SSM parameter can never drift from what the edge function READS at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const edgeConfig = require('../edge/lambda-edge/jwt-auth/config.js') as {
  SSM_PARAMETER_NAME: string;
  SSM_REGION: string;
};
const AUTH_CONFIG_PARAM = edgeConfig.SSM_PARAMETER_NAME;

/** Issuer claim on minted HS256 tokens; must match the CloudFront Function. */
const HS256_ISSUER = 'cloudfront-secure-media';

/**
 * The CDN + edge-auth stack: S3 + CloudFront, plus whichever viewer-request
 * validator the active auth mode needs. Pinned to us-east-1 (Lambda@Edge
 * requirement) so there are no cross-region references.
 */
export class MediaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MediaStackProps) {
    super(scope, id, props);

    const { authMode, userPool, authRegion } = props;
    const userPoolId = userPool.userPoolId;

    // The edge validator reads the SSM parameter from a hardcoded region
    // (config.SSM_REGION); the parameter must therefore be created in that same
    // region. Fail synth loudly if they diverge.
    if (this.region !== edgeConfig.SSM_REGION) {
      throw new Error(
        `MediaStack region (${this.region}) must equal the Lambda@Edge config SSM_REGION ` +
          `(${edgeConfig.SSM_REGION}); the edge validator reads the auth-config parameter from there.`,
      );
    }

    // Auth config the Lambda@Edge validator reads from SSM at cold start.
    // (Lambda@Edge can't use env vars and the pool ID is only known at deploy.)
    new ssm.StringParameter(this, 'AuthConfigParam', {
      parameterName: AUTH_CONFIG_PARAM,
      stringValue: JSON.stringify({ region: authRegion, userPoolId }),
    });

    let edgeFunctionVersion: cloudfront.experimental.EdgeFunction | undefined;
    let viewerFunction: cloudfront.Function | undefined;
    let tokenVendingApiUrl: string | undefined;

    if (authMode === 'lambda-edge') {
      const edgeFn = new cloudfront.experimental.EdgeFunction(this, 'JwtAuthEdge', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        // The nodejs20.x runtime ships the AWS SDK v3 (@aws-sdk/client-ssm), so no
        // bundling/Docker is needed — the asset is just the handler + config.js.
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'edge', 'lambda-edge', 'jwt-auth'), {
          exclude: ['package.json', 'node_modules'],
        }),
        timeout: cdk.Duration.seconds(5),
      });

      // Allow the edge replicas to read the auth-config parameter. The replica
      // assumes the function's role; grant read on the specific parameter ARN.
      edgeFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['ssm:GetParameter'],
          resources: [
            cdk.Arn.format(
              { service: 'ssm', resource: 'parameter', resourceName: AUTH_CONFIG_PARAM.replace(/^\//, '') },
              this,
            ),
          ],
        }),
      );

      edgeFunctionVersion = edgeFn;
    } else {
      // cloudfront-function mode. The CFF validates a short-lived HS256 token
      // minted by the token-vending Lambda. Both share an HMAC secret: the Lambda
      // reads it from Secrets Manager; the CFF reads it from a KeyValueStore that
      // we populate at deploy time (a custom resource copies the secret value in).
      const hmacSecret = new secretsmanager.Secret(this, 'HmacSecret', {
        description: 'HMAC secret shared by the token-vending Lambda and CloudFront Function',
        generateSecretString: {
          passwordLength: 48,
          excludePunctuation: true,
        },
      });

      const kvs = new cloudfront.KeyValueStore(this, 'AuthKvs');

      // Populate the KeyValueStore with the secret value + issuer at deploy time.
      // CloudFront Functions cannot call Secrets Manager, and KVS PutKey requires
      // the store's current ETag (a Describe before each Put), so a Lambda-backed
      // custom resource does it. The secret value is read at deploy time and never
      // rendered into the CloudFormation template.
      // The CloudFront KeyValueStore data-plane (PutKey/DescribeKeyValueStore)
      // requires SigV4A signing, which the Lambda managed runtime's bundled SDK
      // does NOT include. So this asset's node_modules (which pins
      // @aws-sdk/signature-v4a) must ship with the function — bundled at synth
      // via `npm ci`, with no reliance on a pre-existing node_modules.
      const populateFn = new lambda.Function(this, 'PopulateKvsFn', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda', 'kvs-populate'), {
          bundling: nodeModulesBundling(path.join(__dirname, '..', 'lambda', 'kvs-populate')),
        }),
        timeout: cdk.Duration.seconds(30),
      });
      populateFn.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['cloudfront-keyvaluestore:PutKey', 'cloudfront-keyvaluestore:DescribeKeyValueStore'],
          resources: [kvs.keyValueStoreArn],
        }),
      );
      hmacSecret.grantRead(populateFn);

      const populateProvider = new cr.Provider(this, 'PopulateKvsProvider', {
        onEventHandler: populateFn,
      });

      const populate = new cdk.CustomResource(this, 'PopulateKvs', {
        serviceToken: populateProvider.serviceToken,
        properties: {
          KvsArn: kvs.keyValueStoreArn,
          SecretArn: hmacSecret.secretArn,
          Issuer: HS256_ISSUER,
          // Re-run when the secret rotates.
          SecretVersion: hmacSecret.secretFullArn ?? hmacSecret.secretArn,
        },
      });
      populate.node.addDependency(kvs);

      viewerFunction = new cloudfront.Function(this, 'JwtAuthViewer', {
        runtime: cloudfront.FunctionRuntime.JS_2_0,
        keyValueStore: kvs,
        code: cloudfront.FunctionCode.fromFile({
          filePath: path.join(__dirname, '..', 'edge', 'cloudfront-function', 'jwt-auth.js'),
        }),
      });

      const tokenApi = new TokenVendingApi(this, 'TokenApi', {
        userPool,
        issuer: HS256_ISSUER,
        secret: hmacSecret,
      });
      tokenVendingApiUrl = tokenApi.endpointUrl;
    }

    const secure = new SecureDistribution(this, 'Secure', {
      authMode,
      edgeFunctionVersion,
      viewerFunction,
      demoAssetsPath: path.join(__dirname, '..', 'assets', 'demo', 'hls'),
    });

    const distUrl = `https://${secure.distribution.distributionDomainName}`;
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', { value: secure.distribution.distributionId });
    new cdk.CfnOutput(this, 'CloudFrontDistributionDomainName', {
      value: secure.distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, 'CloudFrontDistributionURL', { value: distUrl });
    new cdk.CfnOutput(this, 'DemoVideoUrl', { value: `${distUrl}/big_buck_bunny.m3u8` });
    new cdk.CfnOutput(this, 'BucketName', { value: secure.bucket.bucketName });
    new cdk.CfnOutput(this, 'AuthMode', { value: authMode });
    if (tokenVendingApiUrl) {
      new cdk.CfnOutput(this, 'TokenVendingApiUrl', { value: tokenVendingApiUrl });
    }
  }
}

/**
 * Bundling options that install a Lambda asset's production dependencies into the
 * deployment package at synth time. Runs `npm ci --omit=dev` locally (no Docker)
 * when npm is available, copying the handler + installed node_modules into the
 * asset output; falls back to the Node bundling image otherwise. Used for the
 * kvs-populate function, whose SigV4A signer is not in the Lambda runtime SDK.
 */
function nodeModulesBundling(assetDir: string): cdk.BundlingOptions {
  return {
    image: lambda.Runtime.NODEJS_20_X.bundlingImage,
    command: [
      'bash',
      '-c',
      'cp -au . /asset-output && cd /asset-output && npm ci --omit=dev',
    ],
    local: {
      tryBundle(outputDir: string): boolean {
        try {
          execSync('npm --version', { stdio: 'ignore' });
        } catch {
          return false; // no local npm → fall back to Docker image
        }
        // Copy sources (excluding any existing node_modules), then install.
        fs.cpSync(assetDir, outputDir, {
          recursive: true,
          filter: (src) => !src.includes(`${path.sep}node_modules${path.sep}`) &&
            !src.endsWith(`${path.sep}node_modules`),
        });
        execSync('npm ci --omit=dev', { cwd: outputDir, stdio: 'inherit' });
        return true;
      },
    },
  };
}
