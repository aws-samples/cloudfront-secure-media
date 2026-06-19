// Deploy wrapper: runs `cdk deploy` (forwarding any extra args to CDK, NOT to the
// config step), then regenerates the frontend runtime config.
//
// Why this exists: the old one-line npm script chained both commands with `&&`,
// so `npm run deploy -- -c authMode=cloudfront-function` appended `-c authMode=...`
// to the END of the chain — i.e. to write-frontend-config.mjs, which ignored it —
// and CDK silently deployed the default mode. npm scripts run under `sh -c`, where
// `"$@"` does not forward args, so the reliable fix is this wrapper: it forwards
// process.argv to cdk and only runs the config step on success.
//
//   npm run deploy                                    # lambda-edge (cdk.json default)
//   npm run deploy -- -c authMode=cloudfront-function # forwarded correctly to cdk
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const forwarded = process.argv.slice(2); // extra args after `--`

const run = (cmd, args) => {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (res.status !== 0) process.exit(res.status ?? 1);
};

run("npx", [
  "cdk",
  "deploy",
  "--all",
  "--require-approval",
  "never",
  "--outputs-file",
  "cdk-outputs.json",
  ...forwarded,
]);

run("node", [join(here, "write-frontend-config.mjs")]);
