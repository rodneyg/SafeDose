STATUS: SUCCESS

Added focused unit coverage for the `MIN_DOSES_FOR_PROMOTION` boundary and promotion dismissal. The pull request metadata was prepared, but no remote URL is available in this checkout.

## ATTEMPTS

- Updated the below-threshold case to exercise dose count 3, immediately below the threshold of 4.
- Added a dismissal case that verifies the promotion becomes hidden and the shown date is persisted.

## Evidence paths

- `lib/hooks/__tests__/usePowerUserPromotion.test.ts`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

- `npm test -- --runInBand lib/hooks/__tests__/usePowerUserPromotion.test.ts` passed all 7 tests.
- `npx eslint lib/hooks/__tests__/usePowerUserPromotion.test.ts` passed.
- `git diff --check` passed.
