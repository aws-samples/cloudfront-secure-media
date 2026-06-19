# Integration Tests

Edge-auth integration tests using Node.js built-in test runner (`node:test`).
No additional dependencies — uses `fetch` (Node 22+) and AWS CLI for Cognito user setup.

## Prerequisites

- Node.js ≥ 22
- AWS CLI configured with the deployment profile (`AWS_PROFILE=osmarb-Admin`)
- Foundation stack deployed (`cd foundation && npm run deploy`)
- `foundation/cdk-outputs.json` present (created by `cdk deploy --outputs-file`)

## Running

```bash
cd tests

# Run tests for the currently deployed auth mode:
node --test

# Run only Lambda@Edge tests (requires authMode=lambda-edge deployment):
node --test test-lambda-edge.mjs

# Run only CloudFront Functions tests (requires authMode=cloudfront-function deployment):
node --test test-cloudfront-function.mjs
```

## What They Test

### Lambda@Edge mode (`test-lambda-edge.mjs`)

| Test | Expected |
|------|----------|
| No token | 401 |
| Garbage token | 401 |
| Wrong algorithm (HS256) | 401 |
| Wrong issuer | 401 |
| Wrong `token_use` (id instead of access) | 401 |
| Non-existent kid | 401 |
| Invalid signature | 401 |
| Malformed JWT (2 parts) | 401 |
| Valid Cognito access token → manifest | 200 + `#EXTM3U` |
| Valid token → TS segment | 200 |
| Valid token → non-existent file | 403 (S3) |
| Token not forwarded to origin | 200 (cache-safe) |

### CloudFront Functions mode (`test-cloudfront-function.mjs`)

| Test | Expected |
|------|----------|
| Token-vending API: no auth | 401 |
| Token-vending API: invalid bearer | 401 |
| Token-vending API: valid Cognito token → HS256 JWT | 200 |
| Minted token has correct issuer + short TTL | ✓ |
| No token at edge | 401 |
| Garbage token at edge | 401 |
| Raw Cognito RS256 token at edge | 401 |
| HS256 token with wrong issuer | 401 |
| HS256 token with wrong signature | 401 |
| Expired HS256 token | 401 |
| Valid minted token → manifest | 200 + `#EXTM3U` |
| Valid minted token → TS segment | 200 |
| Valid minted token → non-existent file | 403 (S3) |

## Design Notes

- Tests create a temporary Cognito user, authenticate, and clean up after.
- No mocking — these hit the real deployed CloudFront distribution.
- The CFF tests also validate the token-vending API's behavior.
- Only one test file will pass at a time depending on which `authMode` is deployed.
