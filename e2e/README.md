# Opt-in production scan flow

This is a real production smoke test for SAF-353. It creates a fresh browser context and uses only the app's automatic anonymous session. It uploads one synthetic label, checks the visible scan result or friendly refusal, calculates a synthetic example manually, and reads pricing. It never clicks checkout, Save, or subscription actions.

Run only when authorized to spend one production scan:

```sh
npm ci
npx playwright install chromium
SAFEDOSE_PROD_E2E=1 npm run e2e:prod-scan
```

Without `SAFEDOSE_PROD_E2E=1`, the test is skipped before browser fixtures start. It also skips whenever `CI` is set, even with the opt-in flag. There are no retries and only one worker. The route guard allows at most one analyze attempt per run and blocks other API mutations and payment endpoints. Re-running the command spends another scan, so do not retry it automatically.

The checked-in PNG is the synthetic vial label from T-158, reused with authorization. It has no people or patient data. Manual inputs are a synthetic example: 0.5 mg dose, 2.5 mg/mL strength, 5 mg vial, 1 mL U-100 syringe. The expected result is 0.2 mL / 20.00 units. These are test inputs, not treatment guidance.

Screenshots, the visible scan outcome, and a sanitized method/path/status API log are retained under `.prod-e2e-results/<timestamp>/`. No traces, videos, network bodies, headers, query strings, or browser session storage are saved. The timestamp keeps earlier artifacts intact. Jest ignores `e2e/` because Playwright runs this spec separately.

The original live check is recorded in `evidence-t160/`. It used headless Chromium through Playwright, made exactly one POST to `/api/analyze-scan`, and received HTTP 200 with a friendly refusal. The committed spec follows the observed UI controls. Its full opted-in flow was not replayed during T-160, to respect the one-request limit.
