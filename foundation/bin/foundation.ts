#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { MediaStack } from '../lib/media-stack';
import { AuthMode } from '../lib/constructs/secure-distribution';

const app = new cdk.App();

// Everything is pinned to us-east-1 because Lambda@Edge functions must live
// there; keeping the whole app in one region avoids cross-region references.
const env = { region: 'us-east-1', account: process.env.CDK_DEFAULT_ACCOUNT };

// Edge-auth mode: `cdk deploy -c authMode=lambda-edge|cloudfront-function`.
const authModeRaw = (app.node.tryGetContext('authMode') as string) || 'lambda-edge';
if (authModeRaw !== 'lambda-edge' && authModeRaw !== 'cloudfront-function') {
  throw new Error(
    `Invalid authMode "${authModeRaw}". Use "lambda-edge" or "cloudfront-function".`,
  );
}
const authMode = authModeRaw as AuthMode;

const auth = new AuthStack(app, 'CfSecureMedia-Auth', { env });

const media = new MediaStack(app, 'CfSecureMedia-Media', {
  env,
  authMode,
  userPool: auth.userPool,
  authRegion: env.region,
});
media.addDependency(auth);

app.synth();
