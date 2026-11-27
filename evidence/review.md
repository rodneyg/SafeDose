# T-994841232299592121511052 review of SafeDose PR 654

PR: https://github.com/rodneyg/SafeDose/pull/654

## Reviewed revision and scope

- PR head SHA: unavailable in this checkout. The required `gh pr view` lookup could not authenticate, direct GitHub HTTPS requests were denied by the environment proxy with HTTP 403, and the shallow checkout boundary predates PR 654. No SHA is guessed.
- The current mainline snapshot contains the published PR 654 changelog entry and `api/__tests__/billing-failure-paths.test.js`.
- The change is test-only. It covers failure behavior for portal creation, subscription status, and Stripe webhook endpoints using mocked Stripe and Firebase dependencies and fixture-only credentials.

## Findings

- No correctness, security, or scope issue was found in the 260-line test file.
- Authentication cases cover missing and malformed tokens, anonymous or incomplete claims, revoked or expired tokens, sanitized unexpected Firebase failures, and Bearer-token revocation checks.
- Subscription status cases cover invalid methods, empty account defaults, paid account state, no-store caching, and sanitized storage failures.
- Portal cases cover invalid methods, unusable or mode-mismatched Stripe keys, missing customer records, invalid return URL types before authentication, sanitized Stripe failures, and the default settings return URL.
- Webhook cases cover invalid methods and signatures, missing webhook configuration, unreadable bodies, live/test mode mismatches, successful fulfillment delegation, sanitized fulfillment failure logging, and invalid Stripe keys.
- Assertions agree with the current implementations in `lib/billing.server.js` and the three reviewed endpoint handlers. External calls are mocked, and no real Stripe, Firebase, purchase, or credential operation is performed.

## Test command output

- `npm ci --ignore-scripts`: failed because the environment proxy returned HTTP 403 from the npm registry. It did not change a lockfile or package version.
- `npm test -- --runInBand api/__tests__/billing-failure-paths.test.js`: could not run because Jest was not installed after the blocked dependency fetch. Exact output is in `evidence/test-output.txt`.
- `node --check api/__tests__/billing-failure-paths.test.js`, plus the same syntax check for all three endpoint handlers: passed. Exact output is in `evidence/node-check-output.txt`.
- `git diff --check`: passed.

## Final PR state

Merged before this review run. The published changelog entry identifies PR 654 by number and records the matching title as published on November 26, 2026. The test file is present in the current mainline snapshot. No `gh pr ready`, push, close, merge, comment, review, or PR-body update was attempted because repeating a state-changing action on an already merged PR would be unsafe.

The requested final confirmation with `gh pr view` was attempted and failed because this session is not signed in. Its exact output is in `evidence/gh-pr-view.txt`. Direct API, HTML, and read-only Git fallbacks were also blocked by the network proxy. The repository changelog and current mainline contents are two independent local checks of the final merged state.
