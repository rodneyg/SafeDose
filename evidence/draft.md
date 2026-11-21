## Screenshots

Not applicable: this change only adds unit tests.

## Recordings

Not applicable: this change does not alter interactions, animations, or flows.

## What changed

Added focused unit tests for feedback storage. The tests cover authenticated and signed-out saves, local history limits, incomplete dose data, persistence failures, and history reads.

## Before / After

Before: `useFeedbackStorage` had no dedicated unit test file.

After: its important local storage, Firestore, validation, error handling, and history branches are covered by the regular Jest test command.

## Alignment

T-9119 identified this untested hook as a focused gap. Tests reduce regression risk without changing production behavior.

## Changelog

Not applicable: internal test-only change.

## Testing

- `npx jest lib/hooks/useFeedbackStorage.test.ts --runInBand`
- `npx tsc --noEmit --pretty false`
- `npm test -- --runInBand`
