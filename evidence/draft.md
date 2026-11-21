## Screenshots

Not applicable: test-only change with no visual behavior changes.

## Recordings

Not applicable: test-only change with no interaction or flow changes.

## What changed

Added focused unit tests for every exported helper in `lib/dosing/inputs.ts`. The tests cover valid input and important rejection branches for numbers, units, planner values, concentrations, and syringe selections.

## Before / After

Before: `lib/dosing/inputs.ts` had no dedicated unit test file.

After: the module has 51 focused tests and reaches 100% statement, branch, function, and line coverage in the focused coverage run.

## Alignment

This work completes T-9122, which identified the dosing input parser as an important untested safety boundary.

## Changelog

Not applicable: internal test-only change.

## Testing

- `npm test -- --runInBand lib/dosing/__tests__/inputs.test.ts`
- `npm run typecheck:dosing`
- `npx jest lib/dosing/__tests__/inputs.test.ts --runInBand --coverage --collectCoverageFrom='lib/dosing/inputs.ts' --coverageThreshold='{}'`
- `npm test -- --runInBand` (new suite passed; full run reported one unrelated timeout in `components/PhotoScanErrors.integration.test.tsx`)
