# 📋 Release Notes

## Version 3.0.0 — CDK Foundation, Dual Edge-Auth Modes & UI Redesign

> **Breaking:** the Amplify backend has been replaced by a standalone AWS CDK app and the
> repository has been restructured. Deployment commands have changed — see
> [README](README.md) and [docs/EDGE-AUTH-MODES.md](docs/EDGE-AUTH-MODES.md).

### 🏗️ Infrastructure — Amplify → CDK

- **New `foundation/` CDK app** replaces the Amplify backend entirely. Two stacks:
  `auth-stack.ts` (Cognito) and `media-stack.ts` (S3 with Origin Access Control,
  CloudFront, the edge validator).
- **One-command deploy**: `cd foundation && npm run deploy` provisions everything, writes
  CDK outputs, and generates the frontend's `runtime-config.json` via
  `scripts/write-frontend-config.mjs`.
- **HLS asset pipeline** moved to `foundation/scripts/convert-to-hls.sh`.

### 🔀 Two interchangeable edge-auth modes

Both validate a token at the CloudFront edge before any byte leaves S3, selectable at
deploy time — the **same frontend build works with either** (mode is read from
`runtime-config.json` at runtime).

- **Lambda@Edge (default)** — validates the Cognito **RS256** access token directly on
  `viewer-request` (`alg` → `iss` → `token_use` → RSA signature against runtime-fetched
  JWKS → `exp`), then strips the token before the origin. No extra services.
- **CloudFront Functions + token-vending API** — because the CFF runtime has no RSA, a
  short-lived (5-min) **HS256** token is minted by a token-vending Lambda and verified via
  HMAC at the edge. The vending endpoint is not publicly callable (security-baseline).
- Switch with `npm run deploy -- -c authMode=cloudfront-function` and refresh.

### 🎨 Frontend — Twitch-branded redesign

- **New design system** (a token layer in `frontend/src/styles/tokens.css`):
  light theme on Twitch's brand palette (purple `#6441a5`, light purple `#b9a3e3`, dark grey
  `#262626`, light grey `#f1f1f1`). Single clean sans (Hanken Grotesk) + IBM Plex Mono for
  data. No emojis, no gradients.
- **Video-first layout**: a large rounded 16:9 player stage with a live status strip, and
  roomy Source / Diagnostics panels below.
- **Modular components & hooks**: the former monolithic `Home` is split into `TopBar`,
  `VideoCard`, `SourceControl`, `StatsPanel`, `DiagnosticsPanel`, `Loading`, and a `player/`
  module, with `usePlayerStats` / `useSourceProbe` hooks and scoped CSS Modules.
- **Runtime config**: `frontend/src/config/runtimeConfig.js` loads `runtime-config.json` and
  configures Amplify before render; `frontend/src/auth/streamToken.js` picks the right stream-token
  scheme for the deployed edge mode (including short-lived token refresh).

### 🎬 Player — modern Video.js 8 API

- Adopted the official React 18 player pattern (imperative `<video-js>` element) — fixes the
  StrictMode "element not in DOM" warning and the blank-video issue.
- Replaced the deprecated `videojs.Vhs.xhr.beforeRequest` with the modern per-player
  `vhs.xhr.onRequest` hook (registered on `xhr-hooks-ready`); safe `tech()` access.
- Muted autoplay so the hero stage starts reliably; corrected token-refresh so refreshed
  tokens actually reach segment requests.

### 🧪 Testing

- **New `tests/` suite** with end-to-end checks for both edge modes
  (`test-lambda-edge.mjs`, `test-cloudfront-function.mjs`) plus shared `helpers.mjs`.

### 📚 Documentation & repository layout

- App relocated under **`frontend/`**; docs consolidated under **`docs/`**
  (`ARCHITECTURE.md`, `EDGE-AUTH-MODES.md`; `doc/` images moved to `docs/`).
- README rewritten around the two edge-auth modes and the new deploy flow.
- `.gitignore` hardened (root-level `node_modules` / build catch-all).

---

*For deployment instructions, see the main [README](README.md) and
[docs/EDGE-AUTH-MODES.md](docs/EDGE-AUTH-MODES.md).*
