# SafeDose verification

The repo-root verifier uses fixed fixtures, a frozen `2026-01-15T12:00:00Z` clock, fixed entropy, mocked scan and Stripe transports, and a dependency-free PNG renderer. It makes no live writes.

```sh
./verify seed
./verify run --list
./verify run dose-calculation
./verify screenshot --list
./verify screenshot welcome
./verify check
```

`npm run verify -- seed` and the other commands work the same way. `seed` writes `.verify/work/state.json`. Flow commands print one stable JSON object. Screenshot commands write `.verify/work/shots/<page>.png` and print its stable SHA-256. List commands print names in stable order.

Typical output ends with `"ok": true` for a flow or screenshot. A successful gate ends with `check: 11 passed, 0 failed`.

Committed flow baselines are in `scripts/verify/baselines/flows/`. PNG baselines are in `scripts/verify/baselines/linux/` and `scripts/verify/baselines/darwin/`. Baselines never change during normal runs. Update them deliberately:

```sh
VERIFY_UPDATE_BASELINES=1 ./verify run dose-calculation
VERIFY_UPDATE_BASELINES=1 ./verify screenshot welcome
```

Repeat for every listed flow or page after reviewing an intentional change. Identical inputs on one machine and OS must produce byte-identical stdout and screenshots. `./verify check` is the CI gate. It runs the seven required CI commands, every flow, baseline comparisons, screenshot comparisons, and seed idempotence. The known-failing full Jest suite and lint are not gates.
