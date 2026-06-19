# Edge Auth Modes: Lambda@Edge vs CloudFront Functions

This sample ships **two interchangeable edge-validation modes**, both deployed by the same CDK app
([`foundation/`](../foundation)). Pick one at deploy time:

```sh
cd foundation
npm run deploy                       # lambda-edge (default)
npm run deploy:cloudfront-function   # cloudfront-function
```

The frontend reads the active mode from `runtime-config.json` at runtime, so the **same build** works
with either — re-deploy and refresh to switch.

## ⚠️ Key constraint: no RSA at the edge

CloudFront Functions run a restricted JavaScript runtime whose `crypto` module supports **HMAC and
hashing only — no RSA**. Cognito access tokens are **RS256**, so a CloudFront Function *cannot*
validate them directly. That is the entire reason the two modes differ.

## Mode 1 — Lambda@Edge (default)

The Lambda@Edge function ([`foundation/edge/lambda-edge/jwt-auth/index.js`](../foundation/edge/lambda-edge/jwt-auth/index.js))
validates the Cognito **RS256** access token directly on `viewer-request`:
`alg === RS256` → `iss` → `token_use === access` → RSA signature (against the runtime-fetched JWKS) →
`exp`, then strips the token before the origin. No extra services.

## Mode 2 — CloudFront Functions + token-vending API

Because the CFF can't verify RS256, it validates a short-lived **HS256** token instead:

1. The frontend calls the **token-vending API** with the user's Cognito access token.
2. The token-vending Lambda mints a short-lived (5-minute) HS256 token and returns it.
3. The frontend sends that HS256 token as `?token=` on HLS requests.
4. The CloudFront Function ([`foundation/edge/cloudfront-function/jwt-auth.js`](../foundation/edge/cloudfront-function/jwt-auth.js))
   recomputes the HMAC and checks `iss` / `exp`, then strips the token before the origin.

### 🔒 Security model of the token-vending API

This is a security-baseline sample, so the token endpoint is **not publicly callable**:

- It sits behind **API Gateway with a Cognito User Pools authorizer** — unauthenticated requests are
  rejected **at the gateway** and never reach the Lambda. There are **no Lambda Function URLs**.
- The Lambda trusts the gateway-validated Cognito claims and only mints the HS256 token.
- The HMAC secret lives in **Secrets Manager**. At deploy time a custom resource copies it into a
  CloudFront **KeyValueStore** (the only way a CloudFront Function can read it — CFFs can't call
  Secrets Manager). The secret value is never rendered into the CloudFormation template.
- Tokens are short-lived (5 min) and auto-refreshed by the frontend, limiting exposure.

## When to use which

| Dimension | Lambda@Edge (default) | CloudFront Functions |
|-----------|------------------------|----------------------|
| Validates Cognito RS256 directly | ✅ Yes | ❌ No — needs the HS256 token-vending API |
| Extra infrastructure | None | API Gateway + Lambda + Secrets Manager + KeyValueStore |
| Signature algorithms | RSA, HMAC, full Node `crypto` | HMAC only |
| Event types | viewer/origin request & response | viewer request & response only |
| Cold start | Yes | None |
| Max execution time | 5 s (viewer) | < 1 ms |
| Code size limit | up to 50 MB | 10 KB |
| Network / filesystem access | Yes | No |
| Relative cost | Higher | ~1/6th of Lambda@Edge |

**Rule of thumb:** keep **Lambda@Edge** if you want to verify the IdP token itself with zero extra
services. Choose **CloudFront Functions** for the lowest latency and cost when you're willing to run a
(properly authenticated) token-vending API.
