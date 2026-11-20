STATUS: BLOCKED
The optional start-day translator and tests are implemented locally, but this isolated environment has no authenticated GitHub route, repository remote, or Sheets route. A PR cannot be opened, checked, or merged here. The requested board updates are queued in pending-board-update.tsv.

## ATTEMPTS

See ATTEMPTS.md. GitHub CLI and the public headless REST fallback were both tried. Local source and history were also checked for an existing implementation.

## Evidence paths

- `lib/dosing/protocolScheduler.ts`
- `lib/dosing/__tests__/protocolScheduler.test.ts`
- `ATTEMPTS.md`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

1. The focused Jest suite passes, including no-op, timezone-safe date-only translation, boundary, and validation cases.
2. The dosing TypeScript project passes type checking.
3. A local source and history search found no existing scheduler implementation.
