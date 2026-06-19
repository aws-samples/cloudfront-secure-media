# 🔐 Secure Media Streaming on CloudFront

Secure HLS video streaming where the authorization decision is made **at the CloudFront edge**
before any byte leaves S3. Users sign in with Amazon Cognito; the edge validates a token on every
segment request. Two interchangeable edge-auth modes are included — **Lambda@Edge** and
**CloudFront Functions** — selectable at deploy time.

📋 **[Release Notes](RELEASE_NOTES.md)** | 🏗️ **[Architecture](docs/ARCHITECTURE.md)** | 🔀 **[Edge Auth Modes](docs/EDGE-AUTH-MODES.md)** | 📖 **[Blog](docs/BLOG.md)** | 📄 **[License](LICENSE)**

## 🏗️ Architecture

<img src="/docs/JWTTokenwCognito.png" alt="Architecture — JWT validation at the CloudFront edge (Lambda@Edge or CloudFront Functions)" />

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full token flow and design decisions.

**Components**: Amazon Cognito (identity) · CloudFront (CDN) · S3 with Origin Access Control (private
storage) · an edge validator (Lambda@Edge *or* CloudFront Function) · React + Video.js frontend.

## 📁 Repository Layout

```
foundation/      The single AWS CDK app — deploys ALL infrastructure with one `cdk deploy`
                 (Cognito, S3, CloudFront, edge validators, token-vending API, demo content).
frontend/        Pure static React (Vite) app, configured at runtime from the deploy outputs.
docs/            Architecture, edge-auth-mode decision guide, blog, diagrams.
```

## 🔀 Which edge-auth mode? (read before deploying)

| | **Lambda@Edge** (default) | **CloudFront Functions** |
|---|---|---|
| Validates | Cognito **RS256** access token directly | a short-lived **HS256** token minted by a token-vending API |
| Extra infra | none | API Gateway + Lambda + Secrets Manager + KeyValueStore |
| Latency / cost | cold starts, full Node, higher cost | sub-millisecond, no cold start, ~1/6th the cost |
| Token lifetime | Cognito access-token TTL (~60 min) | short (5 min), auto-refreshed by the frontend |
| Choose when | you want to verify the IdP token itself with no extra services | you want lowest latency/cost and control token issuance |

**Security note:** CloudFront Functions cannot do RSA, so they can't validate Cognito tokens directly.
The token-vending API that issues the HS256 token is **not public** — it sits behind **API Gateway with
a Cognito authorizer**, so only authenticated users can mint a stream token. Full details in
**[docs/EDGE-AUTH-MODES.md](docs/EDGE-AUTH-MODES.md)**.

## 🚀 Deploy

### Prerequisites
- AWS credentials configured for your account
- Node.js 20+
- Docker is **not** required

### 1. Deploy the foundation (infrastructure)

```sh
cd foundation
npm install
npx cdk bootstrap                                   # once per account/region (us-east-1)

npm run deploy                       # default: lambda-edge mode
# or:
npm run deploy:cloudfront-function   # CloudFront Functions mode
```

`npm run deploy` runs `cdk deploy --all`, then writes the deploy outputs (Cognito IDs, CloudFront URL,
active auth mode, token API URL) into `frontend/public/runtime-config.json`. The demo HLS video is
uploaded to S3 automatically by the stack.

> **⏱️ Note:** CloudFront takes ~10–15 minutes to fully propagate after the stack completes.

### 2. Run the frontend

```sh
cd ../frontend
npm install
npm run dev          # Vite dev server on http://localhost:3000
```

### 3. Test

1. 📝 Create an account and sign in (Cognito).
2. 🎬 The demo video loads and plays automatically.
3. 🔒 Open the raw video URL directly (no token) — the edge returns **401**.

<img src="/docs/ui-preview.png" alt="Secure Media Player UI" />

## 🔁 Switching modes

Re-deploy with the other `authMode` and refresh the browser — the **same frontend build** reads the
active mode from `runtime-config.json` and adapts automatically:

```sh
cd foundation
npm run deploy:cloudfront-function   # or: npm run deploy  (lambda-edge)
```

## 🎥 Optional: use your own video

```sh
cd foundation
# Place a source file at foundation/assets/demo/source/, then:
./scripts/convert-to-hls.sh
npm run deploy        # re-uploads the HLS output to S3
```

## 🧹 Cleanup *(optional)*

When you're done with the sample, tear down all AWS resources to avoid ongoing charges:

```sh
cd foundation
npx cdk destroy --all
```

> **Lambda@Edge teardown lag:** CloudFront keeps replicated copies of a Lambda@Edge function for up to
> ~1 hour, so `destroy` may fail to delete the edge function on the first try. Re-run `cdk destroy --all`
> after the replicas clear, or delete the leftover `*-JwtAuthEdgeFn*` functions in us-east-1 manually
> once their replicas are gone.

## 📄 License

This sample code is available under a modified MIT-0 [LICENSE](LICENSE).
