// Shared helpers for integration tests.
// Reads the CDK outputs file to get distribution URLs, Cognito pool info, etc.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const foundationDir = join(here, '..', 'foundation');

/**
 * Load CDK outputs written by `cdk deploy --outputs-file cdk-outputs.json`.
 */
export function loadOutputs() {
  const outputsPath = join(foundationDir, 'cdk-outputs.json');
  const raw = JSON.parse(readFileSync(outputsPath, 'utf8'));
  const auth = raw['CfSecureMedia-Auth'] || {};
  const media = raw['CfSecureMedia-Media'] || {};
  return {
    region: auth.AuthRegion,
    userPoolId: auth.UserPoolId,
    userPoolClientId: auth.UserPoolClientId,
    distributionUrl: media.CloudFrontDistributionURL,
    distributionDomain: media.CloudFrontDistributionDomainName,
    demoVideoUrl: media.DemoVideoUrl,
    bucketName: media.BucketName,
    authMode: media.AuthMode,
    tokenVendingApiUrl: media.TokenVendingApiUrl || null,
  };
}

/**
 * Create a temporary Cognito test user and return a valid access token.
 * Cleans up the user on dispose.
 */
export function createTestUser(outputs) {
  const { region, userPoolId, userPoolClientId } = outputs;
  const email = `test-${Date.now()}@integration-test.local`;
  const password = 'IntTest99!Zx';

  execSync(
    `aws cognito-idp admin-create-user --region ${region} --user-pool-id ${userPoolId} ` +
    `--username "${email}" --temporary-password "Tmp12345!" ` +
    `--user-attributes Name=email,Value=${email} Name=email_verified,Value=true ` +
    `--message-action SUPPRESS`,
    { stdio: 'pipe' },
  );
  execSync(
    `aws cognito-idp admin-set-user-password --region ${region} --user-pool-id ${userPoolId} ` +
    `--username "${email}" --password "${password}" --permanent`,
    { stdio: 'pipe' },
  );

  // Temporarily enable USER_PASSWORD_AUTH so the test can authenticate without
  // implementing SRP. Captured here so dispose() can restore the original flows —
  // leaving USER_PASSWORD_AUTH on would be a security residue (plaintext-password
  // auth the SRP-based app never needs).
  const originalAuthFlows = JSON.parse(
    execSync(
      `aws cognito-idp describe-user-pool-client --region ${region} --user-pool-id ${userPoolId} ` +
      `--client-id ${userPoolClientId} --query "UserPoolClient.ExplicitAuthFlows" --output json`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ),
  );
  execSync(
    `aws cognito-idp update-user-pool-client --region ${region} --user-pool-id ${userPoolId} ` +
    `--client-id ${userPoolClientId} ` +
    `--explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH`,
    { stdio: 'pipe' },
  );

  const result = JSON.parse(
    execSync(
      `aws cognito-idp initiate-auth --region ${region} --auth-flow USER_PASSWORD_AUTH ` +
      `--client-id ${userPoolClientId} ` +
      `--auth-parameters USERNAME=${email},PASSWORD="${password}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    ),
  );

  const accessToken = result.AuthenticationResult.AccessToken;
  const idToken = result.AuthenticationResult.IdToken;

  return {
    email,
    accessToken,
    idToken,
    dispose() {
      try {
        execSync(
          `aws cognito-idp admin-delete-user --region ${region} --user-pool-id ${userPoolId} --username "${email}"`,
          { stdio: 'pipe' },
        );
      } catch { /* best-effort cleanup */ }
      // Restore the app client's original auth flows (don't leave USER_PASSWORD_AUTH on).
      try {
        execSync(
          `aws cognito-idp update-user-pool-client --region ${region} --user-pool-id ${userPoolId} ` +
          `--client-id ${userPoolClientId} --explicit-auth-flows ${originalAuthFlows.join(' ')}`,
          { stdio: 'pipe' },
        );
      } catch { /* best-effort cleanup */ }
    },
  };
}

/**
 * Craft a fake JWT with arbitrary header/payload (no valid signature).
 */
export function craftJwt(header, payload, sig = 'invalidsig') {
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${h}.${p}.${sig}`;
}
