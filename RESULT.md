STATUS: SUCCESS

Issue #378 was already completed on main by commit `65de4af`, which added unit tests for `useWhyAreYouHereTracking`. The hook and its tests were later removed by commit `a094bd6` when the feature was consolidated into `useOnboardingSurvey`. No product code change is needed.

## ATTEMPTS

1. Confirmed commit `65de4af` is an ancestor of the current main snapshot.
2. Confirmed `a094bd6` removed the hook and replaced it with `useOnboardingSurvey` and focused tests.

Evidence paths: `lib/hooks/useOnboardingSurvey.test.tsx`, `lib/hooks/useOnboardingSurvey.ts`, and Git commits `65de4af` and `a094bd6`.

## How we verified

1. `npm test -- --runInBand lib/hooks/useOnboardingSurvey.test.tsx` passed all four focused replacement-hook tests.
2. `npx tsc --noEmit` passed.
3. `git merge-base --is-ancestor 65de4af HEAD` passed.
