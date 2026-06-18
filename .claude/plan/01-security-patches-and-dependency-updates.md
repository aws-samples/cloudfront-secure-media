# Plan: Security Patches & Dependency Updates

## Problem

Multiple dependency groups are outdated and carry known vulnerabilities or incompatibilities:

| Package | Current | Issue |
|---------|---------|-------|
| `jsonwebtoken` (Lambda) | `^8.5.1` | EOL branch; v9.x has critical CVE fixes (algorithm confusion, key handling) |
| `jwk-to-pem` (Lambda) | `^2.0.4` | Unused at runtime (primary impl uses native `crypto`) but still in package |
| `typescript` (CDK) | `^4.9.5` | TS 4.x is unmaintained; CDK 2.189+ supports TS 5.x |
| `react-scripts` (frontend) | `5.0.1` | Last CRA release; carries transitive vulnerabilities in webpack/postcss |
| `@aws-amplify/cli-extensibility-helper` | `^3.0.0` | Should track current Amplify CLI version |
| `aws-cdk-lib` | `~2.189.1` | Check for latest 2.x patch (security + construct fixes) |

## Actions

### Phase 1 — Lambda@Edge (highest risk surface)

1. **Remove unused deps from Lambda package.json.** The primary `index.js` uses only native `crypto` — `jsonwebtoken` and `jwk-to-pem` are not imported. Confirm with `grep -r "require.*jsonwebtoken\|require.*jwk-to-pem" amplify/backend/function/jwtauth/src/index.js`, then remove both from `amplify/backend/function/jwtauth/src/package.json`.
2. **Audit the alternative implementation** in `amplify/hooks/lambda-edge-function.js`. It still uses `jsonwebtoken` and a hand-rolled `jwkToPem`. If this file is kept as reference, upgrade `jsonwebtoken` to `^9.0.2`. If it's dead code, delete it.
3. **Pin Node.js runtime.** Lambda `engines` says `>=22.0.0`, CloudFormation template says `nodejs22.x`. Verify Lambda@Edge supports Node 22 in us-east-1 (check AWS docs — as of mid-2025, Node 20 is the latest supported for Lambda@Edge). If not supported, downgrade to `nodejs20.x`.

### Phase 2 — CDK Stack

4. **Bump `aws-cdk-lib`** to latest `~2.x` patch. Run `npm outdated` in `amplify/backend/custom/customResource2bc9d7e6/`.
5. **Upgrade TypeScript** to `^5.5` (or latest 5.x). Update `tsconfig.json` if needed.
6. **Check `@aws-amplify/cli-extensibility-helper`** compatibility with current Amplify CLI version.

### Phase 3 — Frontend

7. **Run `npm audit`** at root. Triage findings — most will come from `react-scripts` transitive deps.
8. **Evaluate CRA replacement.** `react-scripts` is unmaintained. Options:
   - **Vite + `@vitejs/plugin-react`** — fast, actively maintained, straightforward migration for a single-page app this size.
   - **Stay on CRA** but pin transitive deps to patched versions via `overrides` in package.json.
   Recommendation: migrate to Vite. The app is small (5 components, no SSR) and the migration is mechanical.
9. **Update `aws-amplify` and `@aws-amplify/ui-react`** to latest 6.x.
10. **Update `react` and `react-dom`** — check if React 19 is stable and compatible with Amplify UI.

### Phase 4 — CloudFront Functions Reference

11. **Create a CloudFront Functions implementation** as an alternative to Lambda@Edge. CloudFront Functions run on the edge (faster, cheaper, no cold start) but have restrictions (no network calls, 10KB code limit, JS-only runtime). Since the JWT validation only needs `crypto` operations on pre-baked JWKS, it fits within CloudFront Functions constraints.
12. **Add reference implementation** at `amplify/backend/custom/cloudfront-functions/jwt-auth.js` (CloudFront Functions use a restricted JS runtime — no Node.js modules, only `crypto` from the CloudFront JS runtime).
13. **Document tradeoffs** between Lambda@Edge and CloudFront Functions approaches in the README or a dedicated doc.

## Verification

- `npm audit` returns 0 critical/high in all three package locations
- `amplify push` succeeds with updated deps
- Lambda@Edge validates tokens correctly after redeployment
- Frontend builds and runs with `npm start`
