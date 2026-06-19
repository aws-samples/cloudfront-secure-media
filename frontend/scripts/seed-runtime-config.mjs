// Seeds frontend/public/runtime-config.json from the committed example when it is
// missing, so a fresh clone can `npm run dev`/`build` before any deploy.
//
// The real runtime-config.json is gitignored — it holds deploy-specific values
// (Cognito IDs, CloudFront URL) written by the foundation deploy
// (foundation/scripts/write-frontend-config.mjs). This only creates a placeholder
// when none exists; it never overwrites a real one.
import { copyFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(dirname(here), "public");
const target = join(publicDir, "runtime-config.json");
const example = join(publicDir, "runtime-config.example.json");

if (existsSync(target)) {
  process.exit(0);
}

copyFileSync(example, target);
console.log(
  "Seeded public/runtime-config.json from the example (placeholder values). " +
    "Run the foundation deploy to populate real values."
);
