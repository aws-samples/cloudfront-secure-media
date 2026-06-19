import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export interface TokenVendingApiProps {
  /** User pool whose tokens the API Gateway authorizer validates. */
  userPool: cognito.IUserPool;
  /** Issuer claim placed on minted HS256 tokens; must match the CFF's check. */
  issuer: string;
  /** HMAC secret shared with the CloudFront Function (via KeyValueStore). */
  secret: secretsmanager.ISecret;
  tokenTtlSeconds?: number;
}

/**
 * Token-vending API for the CloudFront Functions auth mode.
 *
 * SECURITY: there is NO public Lambda Function URL. Requests go through API
 * Gateway with a Cognito User Pools authorizer, so unauthenticated callers are
 * rejected AT THE GATEWAY and never reach the Lambda. The Lambda trusts the
 * gateway-validated Cognito claims and only mints the short-lived HS256 token.
 */
export class TokenVendingApi extends Construct {
  public readonly endpointUrl: string;

  constructor(scope: Construct, id: string, props: TokenVendingApiProps) {
    super(scope, id);

    const fn = new lambda.Function(this, 'Fn', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..', '..', 'lambda', 'token-vending')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        ISSUER: props.issuer,
        TOKEN_TTL_SECONDS: String(props.tokenTtlSeconds ?? 300),
        SECRET_ARN: props.secret.secretArn,
      },
    });
    props.secret.grantRead(fn);

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'cloudfront-secure-media-token',
      description: 'Mints short-lived HS256 stream tokens for authenticated Cognito users.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
        allowHeaders: ['Authorization', 'Content-Type'],
      },
      deployOptions: { stageName: 'prod' },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuth', {
      cognitoUserPools: [props.userPool],
    });

    // GET /token — protected by the Cognito authorizer at the gateway edge.
    const token = api.root.addResource('token');
    token.addMethod('GET', new apigateway.LambdaIntegration(fn), {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    this.endpointUrl = `${api.url}token`;
  }
}
