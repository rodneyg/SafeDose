# PR 667 CI evidence

## Before

Failing check: source formatting / lint check.

Log excerpt:

```text
lib/exportDoseLogCsv.ts
  Unexpected irregular whitespace (U+FEFF byte-order mark)
```

The source embedded a literal U+FEFF character in the Blob input. The test already expressed the same byte-order mark as `\\uFEFF`.

## Fix

Fix commit SHA: 8d36b4c226048d87d2c6eb15033f22edab027c18

The literal byte-order mark was replaced with the explicit `\\uFEFF` escape. Runtime CSV output is unchanged.

## After

`gh pr checks 667 --repo rodneyg/SafeDose` could not be captured because this environment has no signed-in GitHub session and its public GitHub access is blocked by an HTTP 403 proxy response.

```text
$ gh auth status
You are not logged into any GitHub hosts.

$ gh pr checks 667 --repo rodneyg/SafeDose
GitHub CLI is not authenticated in this environment.
```
