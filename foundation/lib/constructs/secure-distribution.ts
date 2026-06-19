import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export type AuthMode = 'lambda-edge' | 'cloudfront-function';

export interface SecureDistributionProps {
  /** Which edge-auth handler to attach to the default behavior's viewer-request. */
  authMode: AuthMode;
  /** Lambda@Edge function version (required when authMode === 'lambda-edge'). */
  edgeFunctionVersion?: cloudfront.experimental.EdgeFunction | undefined;
  /** CloudFront Function (required when authMode === 'cloudfront-function'). */
  viewerFunction?: cloudfront.Function | undefined;
  /** Local directory of HLS demo assets to upload to the bucket. */
  demoAssetsPath: string;
}

/**
 * Private S3 bucket + CloudFront distribution wired with Origin Access Control,
 * and a single viewer-request edge handler chosen by `authMode`.
 *
 * Uses the L2 `Distribution` (not L1 `CfnDistribution`) so the edge association
 * is native — this is what removed the old imperative post-push hook. The OAC and
 * the distribution-scoped bucket policy are created automatically by
 * `S3BucketOrigin.withOriginAccessControl`.
 */
export class SecureDistribution extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SecureDistributionProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'MediaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Build the viewer-request association for whichever mode is active. Two
    // viewer-request handlers cannot coexist on one behavior, so exactly one is set.
    const edgeLambdas =
      props.authMode === 'lambda-edge' && props.edgeFunctionVersion
        ? [
            {
              functionVersion: props.edgeFunctionVersion.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
              includeBody: false,
            },
          ]
        : undefined;

    const functionAssociations =
      props.authMode === 'cloudfront-function' && props.viewerFunction
        ? [
            {
              function: props.viewerFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ]
        : undefined;

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'Secure media delivery with JWT token validation',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        edgeLambdas,
        functionAssociations,
      },
    });

    // Upload the HLS demo content to the bucket root.
    new s3deploy.BucketDeployment(this, 'DemoContent', {
      sources: [s3deploy.Source.asset(props.demoAssetsPath)],
      destinationBucket: this.bucket,
      // Don't let the deployment delete objects it didn't add.
      prune: false,
    });
  }
}
