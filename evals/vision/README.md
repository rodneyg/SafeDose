# Vision evals (SAF-107)

**LABELS PENDING RODNEY VERIFICATION — scores are not an official accuracy gate.**

Stacked on SAF-102 (#411). The app and harness both use `lib/scan`: `readScan`, `parseScanModelOutput`, `mapScanToDoseInputs`, and the same prompt/request builder. The only transport differences are the existing app client, an environment-keyed Node client, or injected offline text. No credentials or React dependencies exist in the shared module. App key handling is unchanged (SAF-110).

## Run without pixels, keys, or network

```sh
nvm use
npm ci
npm run typecheck:vision
npm run test:vision
npm run eval:vision
# Explicit equivalent, even if OPENAI_API_KEY exists:
npm run eval:vision -- --offline
```

`.nvmrc` selects Node 20 for CI. The existing deployment engine setting remains Node 22. The lockfile installs with Node 20; npm may report existing engine/deprecation/audit warnings. No dependency versions changed.

Offline is always the default. There is no implicit live mode when a key is present. Twelve synthetic model-output fixtures exercise parsing, mapping, and scan-to-`lib/dosing.calculateDose`, including an intentionally wrong concentration that produces 0.125 mL instead of the independently authored 0.25 mL. The would-be gate should **FAIL** on that negative fixture while the informational CI job succeeds. These are authored test doubles based on realistic shapes, not claimed model recordings or predictions from the photo set. Every fixture remains `verified_by: "pending-rodney"`.

The committed manifest is a JSON-only snapshot of the 111 local labels, with `verified_by: "pending-rodney"` and `review.status: "pending"` on every entry. It preserves sources, licenses, sha256, and estimated-photo/exact-render provenance. It contains no pixels. The local manifest is authoritative when an image store is supplied. Rodney has not independently verified either the image labels or synthetic fixture expectations.

Rows without recordings are explicitly `not-evaluated`. They are classified `refused-or-asked` because no number is offered, but are excluded from field-accuracy and model-refusal denominators. Reports include observed/unevaluated counts and separate image/synthetic summaries. An offline fixture run establishes **no image-recognition accuracy**. Do not quote combined synthetic/image scores as a photo baseline.

## Private image store and recordings

```sh
export SAFEDOSE_EVAL_IMAGES_DIR=/path/to/private/image-store
# Store contains manifest.json and images/ with paths matching the manifest.
npm run eval:vision -- --offline

# Replay genuine recorded outputs without API calls:
export SAFEDOSE_EVAL_RECORDINGS=/path/to/recordings.json
npm run eval:vision -- --offline
```

`SAFEDOSE_EVAL_IMAGES_DIR` is required for any run reading pixels. No machine-specific fallback exists. When set, **every image** is hash-checked before scoring or submission. Missing or mismatched files fail soft to explicitly unevaluated rows with no pixels sent. When unset, offline replay can score recorded text matched to snapshot ids/hashes without reading pixels. Offline latency measures local read/parse/map/calculation, not historical model latency. Offline cost is always $0.

Recording format (strings or JSON objects for `model_output`):

```json
{
  "model": "gpt-4o-2024-08-06",
  "temperature": 0,
  "prompt_sha256": "sha256 of the exact exported SCAN_PROMPT",
  "outputs": [{"id": "image-id", "sha256": "manifest image sha256", "model_output": {}}]
}
```

Mismatched model, temperature, prompt hash, duplicate ids, or image hashes reject the recording file. Outputs are never synthesized from expected photo labels. Expected refusal labels are used only for scoring: they are never passed into the reader to make the reader appear safe.

## Live path: implemented, not yet run

**Live baseline: not yet run. A live run requires Rodney's explicit spend approval and label review. Do not run this command as part of this PR.**

After approval, with the private store and environment key configured:

```sh
SAFEDOSE_EVAL_IMAGES_DIR=/path/to/private/image-store \
OPENAI_API_KEY="$OPENAI_API_KEY" npm run eval:vision -- --live
```

Exact model: **`gpt-4o-2024-08-06`**, `temperature: 0`, JSON-object response format. Every verified image uses the shared request and parser. No retries are enabled. No `.env` files or Expo configuration are read by the harness. Keys, API errors, and image payloads are not logged. Live responses are saved as replayable text in ignored `evals/vision/.cache/`. This code does not introduce a secret into CI.

The [official OpenAI model page](https://developers.openai.com/api/docs/models/gpt-4o) currently marks this GPT-4o snapshot deprecated. It is retained to honor this task's GPT-4o requirement; account availability has not been verified with a paid call. [JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat) guarantees JSON syntax, not schema adherence, so the shared parser still validates every field. Review model availability before approving a live baseline.

Live reports record token usage. Cost is `null` (unknown) unless both explicit current USD-per-million-token rates are supplied via `SAFEDOSE_EVAL_INPUT_USD_PER_MILLION` and `SAFEDOSE_EVAL_OUTPUT_USD_PER_MILLION`. This avoids hardcoding stale prices. Live summaries exclude synthetic fixtures.

## Safety and scoring rules

- Every populated field needs confidence **>= 0.90**. This conservative cutoff is proposed, not an owner-approved clinical policy. A missing confidence, unreadable syringe, unknown scale, reversed/garbled marks, unsupported U-40 scale, contradictory fill, hidden plunger with a fill estimate, missing unit, or explicit model refusal requests manual input. Supported calculator capacities are checked by the shared mapper. No syringe defaults are invented.
- Vial amounts require explicit mg, mcg, or medication-unit text. Explicit `IU`, `U`, and `USP units` normalize to medication units, without any conversion to mass. A U-100 syringe scale is distinct from medication-unit concentration. Fill is never used as a requested treatment dose.
- `exact-correct`: accepted fields match every labeled, known field exactly, and any supplied dose scenario matches its independently authored expected volume and marking. `refused-or-asked`: the scan, mapper, or calculator requests input (or the row is explicitly unevaluated). `wrong-number-shown`: accepted numeric scan/pipeline output disagrees with known expected fields or an expected-refusal image is accepted. A conservative mismatch includes identity/scale fields that can change the meaning of a displayed number.
- No rounding or implicit tolerance is applied to fill scores. Estimated photo fills and their free-text tolerances remain in the source manifest; their interpretation needs Rodney review. Numeric equality is strict, including between-marks values. This is provisional instrumentation, not an official accuracy claim.
- The confirmation screen can display a finite calculated volume alongside an error. The evaluator still counts an incorrect visible volume as `wrong-number-shown`; an error message alone cannot conceal it from the gate. A regression test covers this behavior without changing the UI.
- The photo labels currently contain no requested dose scenarios. Their scan fields can be scored, but no treatment dose is inferred. Fixtures supply dose contexts for the complete calculator path, including vial-total/solution-volume scenarios. Incomplete contexts request input.
- The app form prefill uses the same mapped values. Refusal appears through the existing scan-error display. Prefill no longer guesses a unit and clears stale medication inputs. This narrow change overlaps SAF-101's in-flight unreadable-syringe/unit-handoff work; reconcile when stacking/merging. Dosing arithmetic itself is unchanged.

Each run writes `evals/results/<UTC-date>-<git-sha>.json` and `.md`, plus Markdown to stdout. Runs on the same date/commit replace that report. Reports include every row's expected/got syringe type/scale/capacity, fill, vial fields, refusal, latency, cost, full dose pipeline, per-field accuracy, group/brand/lighting/angle breakdowns, and every wrong-number case with id/sha256. Fixture hashes identify `text-fixture:<id>`, **not image pixels**. Generated reports, caches, eval pixels, review HTML/PDF, and archives are ignored. Never commit the private image store or upload it to Actions artifacts.

## Proposed gate and CI

`thresholds.json` reflects SAF-106 proposed defaults: zero wrong numbers, >=99% type/capacity accuracy on readable images, all syringe misses caught by refusal/confirmation. `status` is `pending-rodney`, `approved_by` is null. Other policy cutoffs remain unspecified. `evaluateThresholds` reports failures and missing observations. Accuracy has no passing claim when required fields have zero observations.

The `accuracy.yml` workflow runs on every PR and pushes to main. `dosing` runs strict dosing typecheck, all 165 tests, and 100% coverage checks. `eval-vision` runs scan/harness typecheck, unit tests, and offline eval without images or secrets. Both upload summaries and append them to the Actions step summary. Harness crashes or unit test failures fail the check. Unapproved accuracy numbers do not.

`SAFEDOSE_EVAL_ENFORCE=1 npm run eval:vision -- --offline` enables hard failure for a failed would-be gate. Setting thresholds `status` to `approved` also enables enforcement. Keep CI informational until SAF-104 labels are verified and SAF-106 is signed. The synthetic negative fixture intentionally fails zero-wrong-number enforcement; when enabling a real gate, separate diagnostic negatives from the approved image baseline.

Later required-check setup (owner action): **Settings → Branches → rule for main → Require status checks → select `dosing` and `eval-vision`**. This PR does not change protection or repository settings.

## Future image labeling (SAF-104)

See [LABELING_SPEC.md](LABELING_SPEC.md) for the independent review protocol,
200+ image coverage targets, locked holdout, privacy requirements, schema, and
local label validation and metadata ingest commands. The SAF-104 labels are a
separate contract from this existing harness manifest. No images are added.
