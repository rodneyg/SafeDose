# T-160 live headless production evidence

Date: 2026-11-17. Target: https://safedose.rodneygainous.com.

- Guest start: PASS. Used Try Now, skipped birth date with the app's confirmation, completed onboarding as a general user, and reached new dose. No login or signup form was used.
- Photo scan: PASS. Used the camera-denied upload fallback and the synthetic T-158 vial label. Exactly one POST to `/api/analyze-scan`, HTTP 200. The visible refusal was: "We could not read the syringe size or vial strength safely. Try a clear photo showing the syringe scale and vial strength, or enter the details manually."
- Manual entry: PASS. Go Back, Manual, 0.5 mg dose, synthetic substance, concentration 2.5 mg/ml, vial amount 5 mg, Insulin 1 ml U-100. Review and result rendered. Result: Draw to 20.00 units, calculated volume 0.2 ml. Did not save or log a dose.
- Pricing renders: PASS. Monthly $2.99 and yearly $26.99 displayed. No checkout or subscription action was clicked.

The complete `/api/*` request log is `api-requests.json`: only POST `/api/analyze-scan`, status 200. Bodies, headers, query strings, session storage, and tokens were never recorded.

Screenshots:

1. `01-welcome.png`
2. `02-guest-start.png`
3. `03-photo-upload.png`
4. `04-scan-processing.png` (the refusal had already arrived when this snapshot was taken)
5. `05-scan-refusal.png`
6. `06-manual-strength.png`
7. `07-manual-syringe.png`
8. `08-manual-review.png`
9. `09-calculated-dose.png`
10. `10-pricing.png`

Validation:

- `jest-node22.txt`: Node 22, 94 suites and 1,113 tests passed.
- `jest.txt`: initial Node 24 run, also 94 suites and 1,113 tests passed.
- `lint.txt`: ESLint on touched TypeScript/config files, exit 0.
- `playwright-types.txt`: isolated TypeScript check of spec/config, exit 0.
- `playwright-opt-out-node22.txt`: default invocation skipped one test.
- `playwright-ci-guard.txt`: explicit flag plus CI skipped one test.
- `git diff --check`: passed.

The live flow was driven interactively with the Playwright API in a headless browser. The committed opt-in spec follows that observed flow. Its full opted-in path was not replayed, to preserve the task's one-analyze-request limit. An initial onboarding-only browser session stopped before any scan when a demo button selector was corrected. No screen or Chrome GUI was used.

No Stripe or Vercel settings, environment files, secrets, tmux sessions, or existing Chrome windows were touched. No payments or checkout sessions were created.
