## Screenshots

Not applicable: this change only adds unit tests.

## Recordings

Not applicable: this change does not alter interactions, animations, or flows.

## What changed

Added focused unit tests for the evaluation data capture hook. The tests cover authenticated and anonymous capture, local retention, Firestore image privacy, analytics, export filtering, statistics, and safe error fallbacks.

## Before / After

Before: `useEvaluationDataCapture` had no dedicated unit test file.

After: its important storage, privacy, export, statistics, and failure branches run under the regular Jest command.

## Alignment

This completes board task T-9139, which identified the untested evaluation capture hook as focused coverage work.

## Changelog

Not applicable: this is an internal test-only change.

## Testing

- `npm test -- --runInBand lib/hooks/useEvaluationDataCapture.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm test -- --runInBand`
- `git diff --check`
