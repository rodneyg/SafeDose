STATUS: SUCCESS

Added accessible labels and button roles to the scan capture, image retake, and scan cancel controls. Added focused label queries that also verify each control's role.

## ATTEMPTS

- Inspected the local scan and image preview implementations and their focused tests.
- Tried to read issue #376 through GitHub CLI, but this checkout has no GitHub authentication. The task description contained the complete requested acceptance criteria, so implementation and verification continued locally.

Evidence paths:
- `components/ScanScreen.tsx`
- `components/ImagePreviewModal.tsx`
- `components/ScanScreen.autocapture.test.tsx`
- `components/PhotoScanSuccess.integration.test.tsx`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

1. `npm test -- --runInBand components/ScanScreen.autocapture.test.tsx components/PhotoScanSuccess.integration.test.tsx` passed 11 tests across both focused suites.
2. `git diff --check` passed with no whitespace errors.
