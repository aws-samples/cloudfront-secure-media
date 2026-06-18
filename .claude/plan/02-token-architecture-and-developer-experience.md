# Plan: Token Architecture Rework & Developer Experience

## Problem Statement

### Token Generation vs Validation Mismatch

The current flow uses Cognito **access tokens** to authorize video streaming. This works technically but is architecturally unsound for a real-world scenario:

1. **Access tokens are for API authorization, not resource access.** Cognito access tokens contain OAuth2 scopes and are meant to authorize API calls to resource servers, not to gate CDN content delivery. The `token_use: "access"` claim validation is checking an incidental property, not a security guarantee.
2. **Tokens are overprivileged.** The access token grants the bearer whatever scopes the Cognito app client has — it's not scoped to "can watch this video" or "can access this content."
3. **No audience restriction.** The token's `aud` claim isn't validated (Cognito access tokens don't have a meaningful `aud`). Any valid access token from the same user pool works.
4. **Token lifetime mismatch.** Cognito access tokens default to 60 minutes. HLS streaming sessions may last longer, causing mid-playback failures. Conversely, for a 5-minute clip, 60 minutes of access is excessive.
5. **Token in query string.** The JWT is passed as `?token=` — it appears in CloudFront access logs, S3 access logs, and browser history. Sensitive tokens in URLs is an OWASP concern.

### Developer Experience Issues

1. **Deployment requires two `amplify push` calls** — the first creates resources, the second configures them. This is fragile and confusing.
2. **JWKS is baked into Lambda code at deploy time.** If Cognito rotates keys, the Lambda must be redeployed.
3. **No local development story** — developers must deploy to AWS to test any token validation changes.
4. **Three package.json files** with overlapping deps (`jsonwebtoken` appears in root and Lambda with different versions).
5. **Config injection via shell commands** in post-push hook — brittle, hard to debug.

## Proposed Options

### Option A: CloudFront Signed Cookies (Recommended)

Replace JWT-in-query-string with CloudFront signed cookies:

1. User authenticates via Cognito (keep this — it's the identity layer).
2. After auth, frontend calls a **token-vending API** (API Gateway + Lambda).
3. The API validates the Cognito token, then generates **CloudFront signed cookies** scoped to:
   - Specific content paths (e.g., `/videos/user123/*`)
   - Time-limited access (match the content duration + buffer)
   - Optional IP restriction
4. Frontend sets the signed cookies; all subsequent HLS requests carry them automatically (no query string modification needed).
5. CloudFront natively validates signed cookies — **no Lambda@Edge needed** for the common path.

**Advantages:**
- Tokens don't appear in URLs/logs
- CloudFront handles validation natively (faster, no cold starts)
- Access scoped to specific content and time windows
- Cognito stays as the identity provider (no rip-and-replace)
- Simpler Video.js integration (no `beforeRequest` hook needed)

**Tradeoffs:**
- Requires a token-vending Lambda behind API Gateway
- Signed cookies need a CloudFront key pair managed in AWS
- Cross-origin cookie handling needs `SameSite`/`Domain` configuration

### Option B: Short-Lived Custom JWT (Alternative)

Keep the JWT approach but fix the architectural issues:

1. Keep Cognito for authentication.
2. Add a **token-vending API** that issues **custom short-lived JWTs** specifically for content access:
   - `sub`: user ID
   - `content`: path or content ID being accessed
   - `exp`: content duration + small buffer
   - `aud`: CloudFront distribution domain
   - Signed with a key managed in Secrets Manager or KMS
3. Lambda@Edge validates the custom JWT (not the Cognito token directly).
4. Optionally move to **CloudFront Functions** for validation (faster, cheaper).

**Advantages:**
- Tokens scoped to specific content
- Short-lived (minutes, not hours)
- Audience-restricted
- Can add custom claims (resolution tier, watermark ID, etc.)

**Tradeoffs:**
- Still puts tokens in query strings (or requires cookie-based approach anyway)
- Still needs edge-side validation code
- More moving parts than Option A

### Option C: CloudFront Signed URLs (Simplest)

Similar to Option A but uses signed URLs instead of cookies:

1. Token-vending API generates CloudFront **signed URLs** per manifest/segment.
2. URLs are time-limited and optionally IP-restricted.
3. No Lambda@Edge needed.

**Tradeoffs:**
- Each segment needs its own signed URL, which complicates HLS playback
- URL signatures appear in logs (same problem as current approach)
- Better suited for single-file downloads than streaming

## Developer Experience Improvements

### Regardless of which token option is chosen:

1. **Consolidate to a single deployment command.** Replace the double `amplify push` with a single orchestrated deployment script that handles resource creation order.

2. **Add a local development mode.** Create a mock token validator that runs locally, so developers can test the frontend without deploying to AWS. Options:
   - Local Express server that mimics the CloudFront + Lambda@Edge behavior
   - Environment variable to bypass token validation in development

3. **Clean up dead code.**
   - Remove `amplify/hooks/lambda-edge-function.js` if it's not the deployed version
   - Remove unused `jsonwebtoken`/`jwk-to-pem` from Lambda package.json
   - Remove `config` package from root package.json (appears unused)

4. **Add a getting-started guide** that explains the architecture decisions, not just the deployment steps. Target audience: developers evaluating this pattern for their own projects.

5. **Add environment variable support** for configuration instead of code generation. The config.js injection pattern is fragile — use Lambda environment variables or SSM Parameter Store.

## Recommended Path

**Start with Option A (signed cookies) as the primary implementation**, keeping the current JWT approach as a documented alternative for cases where cookies aren't viable (e.g., native mobile apps without a web view).

### Implementation Phases

**Phase 1 — Token-vending API:**
- Add API Gateway + Lambda that accepts Cognito auth and returns signed cookies
- Create CloudFront key pair and store private key in Secrets Manager
- Update CDK stack to add the API and key group

**Phase 2 — Frontend integration:**
- Replace `beforeRequest` token injection with cookie-based auth
- Add cookie refresh logic before expiration
- Remove token from React state / prop drilling

**Phase 3 — CloudFront configuration:**
- Add trusted key group to CloudFront distribution
- Configure signed cookie requirements on cache behavior
- Remove Lambda@Edge association (or keep as fallback)

**Phase 4 — Developer experience:**
- Single-command deployment
- Local dev mode
- Architecture documentation
- Clean up dead code and unused dependencies

## Verification

- Authenticated user can stream video via signed cookies (no `?token=` in requests)
- Unauthenticated requests to CloudFront return 403
- Cookies expire after configured TTL
- Local development works without AWS deployment
- Single `npm run deploy` completes successfully
