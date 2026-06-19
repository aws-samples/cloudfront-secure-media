// Maps `cdk deploy --outputs-file cdk-outputs.json` into the frontend's runtime
// config (frontend/public/runtime-config.json), which the React app fetches at
// startup. Run automatically by `npm run deploy`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const foundationDir = dirname(here);
const repoRoot = dirname(foundationDir);

const outputsPath = join(foundationDir, "cdk-outputs.json");
const targetPath = join(repoRoot, "frontend", "public", "runtime-config.json");

const AUTH_STACK = "CfSecureMedia-Auth";
const MEDIA_STACK = "CfSecureMedia-Media";

const raw = JSON.parse(readFileSync(outputsPath, "utf8"));
const auth = raw[AUTH_STACK] || {};
const media = raw[MEDIA_STACK] || {};

const runtimeConfig = {
  region: auth.AuthRegion,
  cognito: {
    userPoolId: auth.UserPoolId,
    userPoolClientId: auth.UserPoolClientId,
  },
  cloudfront: {
    distributionUrl: media.CloudFrontDistributionURL,
    demoVideoUrl: media.DemoVideoUrl,
  },
  authMode: media.AuthMode,
  // Present only in cloudfront-function mode.
  tokenVendingApiUrl: media.TokenVendingApiUrl || null,
};

writeFileSync(targetPath, JSON.stringify(runtimeConfig, null, 2) + "\n");

console.log("✅ Wrote frontend runtime config:");
console.log(`   ${targetPath}`);
console.log(`   authMode: ${runtimeConfig.authMode}`);
console.log(`   cloudfront: ${runtimeConfig.cloudfront.distributionUrl}`);
