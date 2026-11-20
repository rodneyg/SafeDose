STATUS: SUCCESS

Issue #378 is already covered on main. The focused tests exercise the real `useBeforeFirstScanPrompt` behavior for the first and second displays, saved count limit, persisted opt-out, and returning without consuming a display. No application or test source change was needed.

## ATTEMPTS

- Inspected the hook and focused integration coverage.
- Ran the focused Jest suite successfully.
- Ran the full TypeScript no-emit check successfully.

Evidence paths:

- `components/BeforeFirstScanIntegration.test.ts`
- `evidence-t919/focused-test.txt`
- `evidence-t919/typecheck.txt`

## How we verified

1. `npm test -- --runInBand components/BeforeFirstScanIntegration.test.ts` passed all five focused tests.
2. `npx tsc --noEmit --pretty false` passed.
