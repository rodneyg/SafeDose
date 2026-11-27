# Draft PR update

## Screenshots
Not applicable: test-only coverage fix.

## Recordings
Not applicable: no interaction or flow changed.

## What changed
Added missing vial-supply tests for invalid negative inputs, incompatible units, and older logs from a different vial unit.

## Before / After
Before: the new vial-supply code had branch paths that were not exercised by the 100% dosing coverage gate.

After: focused tests exercise those paths without changing production behavior.

## Alignment
This fixes the only reported failing check on draft PR 665 so the feature can be reviewed safely.

## Changelog
Not applicable: test-only change.

## Testing
- Focused vial-supply behavior smoke test using TypeScript compilation and Node assertions.
- Dosing Jest command attempted, but dependency installation is blocked by an HTTP 403 from the package registry.
