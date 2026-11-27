# Draft PR update

## Screenshots

Not applicable: the CSV bytes and UI are unchanged.

## Recordings

Not applicable: the interaction and flow are unchanged.

## What changed

Replaced a raw byte-order-mark character with the equivalent explicit Unicode escape in the web CSV export.

## Before / After

Before: the source contained an invisible U+FEFF character that the formatting check rejected.

After: the source uses `\\uFEFF`, which produces the same CSV byte-order mark without irregular source whitespace.

## Alignment

This is a minimal check-only fix for the existing Export CSV feature.

## Changelog

Not applicable: there is no user-visible behavior change.

## Testing

- Focused CSV tests could not run because dependencies are unavailable in the environment.
- Verified at the byte level that the source no longer contains a literal U+FEFF character.
