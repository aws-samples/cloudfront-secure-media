// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Loads the runtime configuration written by the foundation deploy
// (scripts/write-frontend-config.mjs -> public/runtime-config.json).
//
// Fetched at startup (not imported at build time) so the SAME built bundle works
// against either deployed edge-auth mode — the deploy decides the mode, the app
// just reads it.
//
// Shape:
// {
//   region, cognito: { userPoolId, userPoolClientId },
//   cloudfront: { distributionUrl, demoVideoUrl },
//   authMode: "lambda-edge" | "cloudfront-function",
//   tokenVendingApiUrl: string | null
// }

let cached = null;

export async function loadRuntimeConfig() {
  if (cached) return cached;
  const res = await fetch("/runtime-config.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load runtime-config.json (${res.status})`);
  }
  const cfg = await res.json();

  // The committed runtime-config.json ships with REPLACE_ME placeholders; the
  // foundation deploy overwrites it with real values. If the placeholders are
  // still present, fail with a clear message instead of a confusing Cognito error.
  if (JSON.stringify(cfg).includes("REPLACE_ME")) {
    throw new Error(
      "runtime-config.json still has placeholder values. Deploy the foundation stack " +
        "(cd foundation && npm run deploy) to generate it.",
    );
  }

  cached = cfg;
  return cached;
}
