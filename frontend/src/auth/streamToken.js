// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// Token provider for HLS requests. Abstracts the two edge-auth modes:
//
//   lambda-edge:         the stream token IS the Cognito access token. Lambda@Edge
//                        validates it (RS256) directly at the edge.
//   cloudfront-function: the Cognito access token is exchanged at the token-vending
//                        API for a short-lived HS256 token that the CloudFront
//                        Function can validate (CFF can't do RSA). Cached and
//                        refreshed before expiry.
//
// `decodeExp` reads a JWT's exp (seconds) without verifying — used only to decide
// when to refresh, never for trust.

function decodeExp(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

// Module-scoped cache for the minted HS256 token (cloudfront-function mode).
let mintedToken = null;
let mintedExp = 0; // seconds since epoch

// The token-vending API sits behind an API Gateway Cognito authorizer, which
// validates the `aud` claim — present only on ID tokens — so we authenticate to
// it with the ID token.
async function mintStreamToken(cfg, cognitoIdToken) {
  const res = await fetch(cfg.tokenVendingApiUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${cognitoIdToken}` },
  });
  if (!res.ok) {
    throw new Error(`Token vending failed (${res.status})`);
  }
  const { token } = await res.json();
  mintedToken = token;
  mintedExp = decodeExp(token);
  return token;
}

/**
 * Resolve the token to attach to HLS requests for the given mode.
 *   lambda-edge:         the Cognito ACCESS token (Lambda@Edge checks token_use=access).
 *   cloudfront-function: a short-lived HS256 token minted by the token-vending API,
 *                        which is authenticated with the Cognito ID token.
 * `tokens` is { accessToken, idToken }. Refreshes the minted token near expiry.
 */
export async function getStreamToken(cfg, tokens) {
  if (cfg.authMode !== "cloudfront-function") {
    return tokens.accessToken;
  }
  const now = Math.floor(Date.now() / 1000);
  if (mintedToken && mintedExp - now > 30) {
    return mintedToken;
  }
  return mintStreamToken(cfg, tokens.idToken);
}

/**
 * Milliseconds until the current minted token should be refreshed (30s before its
 * exp), clamped to a sane minimum. Lets callers schedule refresh from the token's
 * own lifetime instead of a hardcoded interval. Returns null when there is no
 * minted token (e.g. lambda-edge mode).
 */
export function msUntilRefresh() {
  if (!mintedToken) return null;
  const now = Math.floor(Date.now() / 1000);
  const seconds = Math.max(mintedExp - now - 30, 15);
  return seconds * 1000;
}
