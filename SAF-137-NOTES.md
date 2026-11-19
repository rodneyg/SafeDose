# SAF-137 implementation notes

Branch: `rodneygainous/saf-137-point-safedose-at-the-vercel`.
Canonical production URL: https://safe-dose.vercel.app.

## Reviewed stack reconciliation

Merged `origin/saf-103-property-tests` into current main (`a4b0f16`) with a merge commit, `c91c73c`, preserving the reviewed histories of #412 (SAF-101), #413 (SAF-103), and #415 (SAF-108). No tests were dropped. Main's #411 pure dosing module, #414 vision evaluation, and #410 splash remain.

Conflicts were limited to `.nvmrc`, `app/(tabs)/new-dose.tsx`, and `lib/cameraUtils.ts`. Kept Node 22 from the stack and the SAF-107 validated scan reader/mapping from main. Retained stack planner-prefill parsing, explicit total-amount unit state, exact concentration handoff, and last-dose handling. Connected scan mapping's totalAmountUnit to the new hook state and cleared it before applying a scan.

Kept exact dosing arithmetic and all safety bounds unchanged: `MAX_INJECTION_VOLUME_ML` remains 2 mL; the 0.005 mL floor and selected-syringe capacity remain blocking. The #412 question about raising the ceiling remains open. SAF-103 clears calculatedVolume, calculatedConcentration, and recommendedMarking on rejection.

The merge already brought the explicit ManualEntryScreen Proceed guard and hook navigation guard. Added independent confirmation/final rendering guards so even stale numeric props cannot show a draw volume, marking, illustration, or calculation breakdown on a blocking error. Nonblocking between-mark guidance still permits progression and renders normally.

## Units, URLs, and deploy changes

- Dose-step validation now checks the dose itself; concentration compatibility remains enforced at concentration entry and calculation.
- Changing dose units repairs incompatible concentration units (units -> units/ml; mass units -> a compatible mass concentration). Compatible mg/mcg conversions are preserved. ConcentrationInputStep's existing selection behavior remains.
- Added actual React hook and rendered UI regression tests, including 10 units at 100 units/ml -> exactly 0.1 mL and U-100 marking 10, mg/mcg paths, incompatible concentration entry/calculation, all three unsafe volume cases, stale result props, and nonblocking guidance.
- Removed two unreachable legacy `solution` mode branches in the touched hook; the active totalAmount reconstitution path remains.
- Replaced all old-domain references found in repo source/config/docs with the canonical Vercel alias. Updated OAuth guidance to distinguish JavaScript origins, redirect URIs, Firebase hostnames, and exact preview hostnames. Firebase/Google placeholders remain unchanged.
- Removed unused `next` and `@types/next` and updated package-lock.json. Added React 18 test renderer development dependencies for real hook/UI tests.
- Unified build/build:web around static Expo export using CI=1, without unsupported --non-interactive. Disabled export telemetry.
- Checkout now uses the existing server-only Stripe configuration, matching the other API routes, instead of tracing client Expo configuration into a Node function. Added api/tsconfig.json with Node settings and dependency declaration checking skipped. It does not change or suppress application TypeScript checking. Existing static Vercel routing/build configuration remains.
- Adapted the vision harness to pass explicit scanned totalAmountUnit into the reconciled calculator. Updated the former retained-unsafe-volume assertion to require all rejected numeric outputs to be null, and retained a separate wrong-number-with-error classifier test. No vision tests were removed, and the wrong-number gate remains conservative.
- Preserved SAF-108 coverage/privacy gates and SAF-107 offline vision CI. Added dose-flow and API TypeScript checks to CI's required dosing job; broad legacy Jest remains informational as before.

## Validation

Dependencies installed in this worktree, followed by successful clean `npm ci --no-audit --no-fund`. Only Node 24.22.0 / npm 11.19.1 was installed locally; Node 22 was not available through nvm or Homebrew. `.nvmrc` and engines remain 22 for CI/production.

| Command/check | Result |
| --- | --- |
| `npm run test:dosing` | PASS: 7 suites, 290 tests; statements, branches, functions, lines all 100%; thresholds unchanged |
| `npm run typecheck:dosing` | PASS |
| `npm run test:dose-flow` | PASS: 1 suite, 11 tests |
| `npm run typecheck:api` | PASS |
| `npm run typecheck:vision` | PASS |
| `npm run test:vision` | PASS: 2 suites, 58 tests |
| `npm run eval:vision -- --offline` | PASS; synthetic/local evaluation only, no paid API calls; does not establish real-image accuracy |
| `npm run build` | PASS: Expo static export produced dist after clean install |
| `npm ls next @types/next --all` | Empty dependency tree (npm returns 1 for an empty selection); no Next package entries remain in manifest/lockfile |
| Checkout `@vercel/nft` dependency trace | 220 files; zero Expo/expo-modules-core/React Native files |
| `git diff --check` | PASS |
| Full `npx jest --runInBand` | 24 failed / 52 passed suites; 11 failed / 703 passed tests, 714 total |
| Full `npx tsc --noEmit` | Still fails with 68 existing application errors; no TS6053, TS6142, or node_modules diagnostics |

Broad Jest failures concern legacy missing test dependencies/modules (including root tsconfig-paths fixture imports), authentication mocks, onboarding/scan legacy expectations, and platform mocks. SAF-108 already records broad-suite failures as informational; the new suite and both dosing/vision suites pass. The initial post-merge vision failures were reconciled as described above, rather than suppressed.

Full application TypeScript errors include pricing typing, old camera APIs, missing Radix toast declarations, web-specific style declarations, and existing Auth/UserProfile/Firestore types. They remain visible in the normal root tsc command. This change isolates the JavaScript server build from the Expo dependency graph rather than weakening root app strictness or dosing checks. Local export and API TypeScript validation pass; an actual Vercel production deployment has not been performed, so hosted deploy success is not claimed.

## Out-of-repo settings Rodney must update

No external settings were changed, no production deployment was triggered, and nothing was pushed.

- Firebase Auth authorized domains: add `safe-dose.vercel.app`, retain localhost as needed, remove or stop relying on the lost custom domain. For previews, register exact required hostnames; do not assume wildcard support.
- Google Cloud OAuth authorized JavaScript origins: `https://safe-dose.vercel.app` and `http://localhost:8081` (plus other localhost ports actually used). Authorized redirect URIs: `https://safe-dose.vercel.app/__/auth/handler` and `http://localhost:8081/__/auth/handler`. Register exact preview origins/redirect URIs when required.
- Stripe: inspect success/cancel URLs, customer portal return URLs, and webhook endpoints for the lost custom domain and update them to the canonical alias with the existing route paths. No dashboard or keys changed here.
- GitHub repository homepage: replace the lost custom-domain URL with `https://safe-dose.vercel.app`. Repo settings were not changed.
- App Store, advertisements, and public marketing links: update to the canonical alias.
- Vercel project domains: custom domain is gone; confirm `safe-dose.vercel.app` stays the production alias. The alternative project alias is not canonical. Domain/auth settings were not changed.

All application edits stayed in this dedicated worktree. Git necessarily updated its linked-worktree metadata in the repository's shared Git directory; no sibling checkout application files were changed. No push, main merge, tags, or Git configuration changes were made.


## OpenAI key no longer ships in the web bundle

The live site was constructing the OpenAI client in the browser (`dangerouslyAllowBrowser`) and Expo `app.config.js` was copying `process.env.OPENAI_API_KEY` into `extra`, which baked the key into public JavaScript.

This follow-up keeps every model call on the server:

- New `POST /api/analyze-scan` reads `process.env.OPENAI_API_KEY` only in the Vercel function. It never returns the key. Missing key → 503. The route reuses the shared `buildScanRequest` / `SCAN_PROMPT` / `SCAN_MODEL` from `lib/scan/request.js` so prompt and safety parsing cannot drift.
- Client scan flow posts the image to that route (`lib/scan/completeOnServer.ts`). `readScan` / `parseScanModelOutput` are unchanged, including refusals, `plunger_visible`, and `SCAN_MIN_CONFIDENCE` 0.9.
- `OPENAI_API_KEY` was removed from `app.config.js` extra and from `types/env.d.ts`. There is no `EXPO_PUBLIC_OPENAI_API_KEY` usage. The vision eval CLI (`evals/vision/run.ts`) still reads `process.env.OPENAI_API_KEY` locally and is not a browser path.
- `npm run check:bundle-secrets` greps the export for OpenAI-style `sk-` tokens and `dangerouslyAllowBrowser`, and prints matching paths only.

### Verification (this follow-up)

| Check | Result |
| --- | --- |
| `npm run test:scan-api` | PASS: 2 suites, 8 tests |
| `npm run test:vision` | PASS: 3 suites, 61 tests (includes existing refusal / plunger / confidence cases) |
| `npm run test:dosing` | PASS: 7 suites, 290 tests; statements, branches, functions, lines all 100% |
| `npm run test:dose-flow` | PASS: 1 suite, 11 tests |
| `npm run typecheck:dosing` | PASS |
| `npm run typecheck:api` | PASS |
| `npm run typecheck:vision` | PASS |
| `npm run build` | PASS: Expo web export to `dist` |
| `npm run check:bundle-secrets` | PASS: 32 files in `dist`; no `sk-` secrets or `dangerouslyAllowBrowser` |
| Canary build-time `OPENAI_API_KEY` | PASS: a non-secret canary value was set during the export and did not appear in `dist` |

Vercel environment variables were not changed. `OPENAI_API_KEY` is already present for Development, Preview, and Production and must stay a server-side variable. After the leaked key is rotated in the OpenAI dashboard, that same Vercel name must be updated to the new value. There is no `EXPO_PUBLIC_OPENAI_API_KEY` (or other client-prefixed OpenAI variable) in Vercel env to remove; do not add one.

Related, not changed here: `app.config.js` extra still lists Stripe secret key fields (`STRIPE_*_SECRET_KEY`). Those would also bake into the client if set at Expo export time.



## Stripe secret keys removed from Expo extra

`app.config.js` extra no longer includes `STRIPE_TEST_SECRET_KEY` or `STRIPE_LIVE_SECRET_KEY`. `lib/stripeConfig.js` (used by the client pricing pages) now exposes only publishable key, price ID, and mode. Server routes still read secrets from `process.env` via `lib/stripeConfig.server.js`. Vercel env was not changed; keep `STRIPE_*_SECRET_KEY` as server-side variables.
