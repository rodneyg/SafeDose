STATUS: SUCCESS

Issue #378 is already complete on main. The former `usePMFSurvey` behavior is now in `useOnboardingSurvey`, and the existing focused test suite uses mocked storage to verify the second-dose trigger, first-dose exclusion, persisted suppression, concurrent deduplication, and account isolation. No application code or tests were changed.

## ATTEMPTS

- Inspected the current hook and focused tests.
- Reviewed Git history to confirm `usePMFSurvey` was superseded by `useOnboardingSurvey`.
- No blockers occurred.

## Evidence paths

- `lib/hooks/useOnboardingSurvey.ts`
- `lib/hooks/useOnboardingSurvey.test.tsx`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

- `npm test -- --runInBand lib/hooks/useOnboardingSurvey.test.tsx` passed all 4 focused tests.
- `npx eslint lib/hooks/useOnboardingSurvey.ts lib/hooks/useOnboardingSurvey.test.tsx` passed.
