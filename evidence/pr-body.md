## Screenshots

Not applicable: this change only adds unit tests.

## Recordings

Not applicable: this change does not alter interactions, animations, or flows.

## What changed

Added focused unit tests for the reconstitution planner hook. The tests cover default state, input method navigation, manual and scanned amounts, unit conversion, validation errors, output navigation, error clearing, and reset behavior.

## Before / After

Before: `useReconstitutionPlanner` had no dedicated hook test file.

After: the hook has 9 focused tests for its important branches and state transitions.

## Alignment

This work addresses T-9120, which identified this untested medication calculation hook as a focused coverage gap.

## Changelog

Not applicable: internal test-only change.

## Testing

- `npm test -- --runInBand lib/hooks/useReconstitutionPlanner.test.ts` (pass, 9 tests)
- `npx tsc --noEmit --pretty false` (pass)
- `npm test -- --runInBand` (1275 passed, 1 unrelated existing timeout in `components/PhotoScanErrors.integration.test.tsx`)
