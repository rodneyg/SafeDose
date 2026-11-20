STATUS: SUCCESS

Added focused tests for issue #376 that prove processing is enabled before capture and disabled by the final cleanup on both success and error.

## ATTEMPTS

- Inspected the current scanner implementation and existing upload tests.
- Added a focused parameterized test for the success and error paths.

Evidence paths:
- `lib/cameraUtils.upload.test.ts`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

- `npx jest lib/cameraUtils.upload.test.ts --runInBand` passed with 14 tests.
- `npx tsc --noEmit --pretty false` passed.
