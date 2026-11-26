# SafeDose vision evals (SAF-104 / SAF-107)

**Labels pending Rodney verification. Scores are not an official accuracy gate.**

The app and harness use `lib/scan`: `readScan`, `parseScanModelOutput`,
`mapScanToDoseInputs`, and the same `SCAN_PROMPT` and request builder. The app
withholds the model's fill estimate and requires the user to verify the syringe
and vial label before opening dose entry.

The scorer reports accepted scans with withheld fills as `unconfirmed-fill`
when there is no visible mismatch. It preserves raw fill errors in field
accuracy, and continues to count wrong visible scan metadata or calculated
numbers. Authored dose scenarios simulate manual entry after verification.
The recorded holdout replays exercise the pre-verification gate.

## Dataset and provenance

The default corpus is `synthetic-manifest.json`: 240 distinct procedural scenes,
192 development and 48 locked holdout. Full schema-valid labels live in
`labels/synthetic-v1/`; manifest entries include the same labels, relative private
pixel paths, source, license, notes, hashes and pending review status. The corpus
check rejects differences between canonical labels and manifest copies.
`corpus.ts` adapts the strict quantity objects into the existing harness contract.
See [COVERAGE.md](COVERAGE.md), [RUN_REPORT.md](RUN_REPORT.md), and
[LABELING_SPEC.md](LABELING_SPEC.md).

The original 111-row `manifest.json` is preserved as a source inventory. Use
`--legacy` to inspect it offline; none of those pixels were materialized in this
run and its single-labeler observations are not newly verified ground truth.
It is not submitted by the live runner. The synthetic corpus adds controlled
coverage but does not substitute for real syringe products and real camera photos.

## Offline commands

```sh
nvm use
npm ci
npm run check:vision-labeling
npm run typecheck:vision
npm run test:vision
npm run eval:vision -- --offline

# Private store contains images/, no local manifest is trusted or required.
SAFEDOSE_EVAL_IMAGES_DIR=/path/to/private/store npm run eval:vision -- --offline
npm run vision:check-exif -- /path/to/private/store/images
```

Offline is the default, even if a key exists. No API calls or env-file reads are
made. With a private store, metadata and selected image hashes must all pass
before evaluation. Missing files, changed hashes, symlinks and EXIF fail the run.
Without pixels or recordings, all 240 image rows remain explicitly unevaluated.
The 12 existing text fixtures exercise the real parser, mapper and calculator,
including an intentionally wrong dose. Fixture scores and image scores have
separate JSON summaries. Unevaluated rows never enter accuracy denominators.
A passing offline command establishes tooling integrity, not image accuracy.

## Rebuild pixels privately

Use Python 3 and Pillow 11.3.0 in a local virtual environment. Supply a local
TrueType font. Font bytes are not redistributed. The render-environment audit
records the font hash; changing font/Pillow may change pixel hashes.

```sh
python evals/vision/scripts/generate-synthetic.py \
  --store /path/outside/repo/private/store --font /path/to/Arial.ttf
python evals/vision/scripts/check-synthetic.py --store /path/outside/repo/private/store
npm run vision:validate-labels
npm run vision:check-corpus
npm run vision:check-exif -- /path/outside/repo/private/store/images
```

The generator refuses a store inside the repo and refuses pixels that differ
from the frozen v1 inventory. Changes require a new corpus version. It never
writes image pixels to git. New RGB PNGs contain no EXIF/GPS; ExifTool checks
this independently. For future external-photo ingest use `vision:strip-exif`
from the labeling specification, then hash the sanitized bytes.

The second automated pass derives fill from geometry, checks visible stopper
contrast in pixels, hashes, null readings on bad images, vial facts, and expected
refusals. `synthetic-review-audit.json` logs disagreements. This is not blinded
human review. Both automated labeler IDs are recorded and every label stays
`review.status: pending` and `verified_by: pending-rodney` in the manifest.

CC0-1.0 applies to original procedural scene artwork, rendered pixels and dataset
labels to the extent copyright applies. Brand names identify illustrative text;
trademark rights and the local font software are excluded. No logos or brand
product photos are reproduced. No patient data or external image assets are used.

## Locked holdout

`syn-v1-cN-bN` sessions each contain six scenes. The split rule is frozen before
predictions: hold out brand index equal to configuration index modulo five.
All scenes of a session stay together; 8/40 sessions give exactly 48/240 images.
The inventory in `synthetic-split-lock.json` pins IDs, pixel hashes and split.
No holdout images are selected by the live runner, and no prompt tuning was
performed. The public lock is an audit record, not access control. A custodian
must restrict holdout access and complete the human release protocol in SAF-166.
Shared render templates also limit statistical independence across sessions.

## Live or replayed predictions

A live call is always explicit. The runner reads a key only from the process
environment, never from `.env` or `.env.local`. Export an existing key externally.
The historical SAF-104 attempt returned HTTP 401 `invalid_api_key`. Live
accuracy for GPT-6 Luna is pending.

```sh
SAFEDOSE_EVAL_IMAGES_DIR=/path/to/private/store \
SAFEDOSE_EVAL_INPUT_USD_PER_MILLION=0.10 \
SAFEDOSE_EVAL_OUTPUT_USD_PER_MILLION=0.50 \
npm run eval:vision -- --live --limit=12
```

Verify rates before future calls. [OpenAI's GPT-6 Luna model page](https://developers.openai.com/api/docs/models/gpt-6-luna)
lists standard rates of $0.10 input and $0.50 output per million tokens for
prompts up to 272K tokens. The runner uses the shared scan request with
`gpt-6-luna`, `reasoning_effort: 'none'`, temperature 0 and JSON-object output.
Responses are capped at 1,200 tokens. The default is 12 development images,
with a hard maximum of 20; selection cycles configurations and includes refusal
cases. At an assumed 3,000 input tokens and 600 output tokens per request, one
12-image run costs an estimated $0.0072. A full 1,050,000-token input context
plus capped output, both at long-context rates, is reserved before each request.
Calls stop before the $3 per-run cap. Actual token-priced
cost and usage are checkpointed after each completion. No retries are enabled.
A timeout can leave invoice cost unknown; inspect provider billing before retrying.
The cap is per invocation; operators must track cumulative job spend.

Replay output offline with `SAFEDOSE_EVAL_RECORDINGS=/path/to/recording.json`.
The runner accepts GPT-6 Luna and historical GPT-4o recordings with temperature
0 and matching prompt, image ID and pixel hash. Replay reports use the model ID
from the recording. The example below uses the historical snapshot:

```json
{
  "model": "gpt-4o-2024-08-06",
  "temperature": 0,
  "prompt_sha256": "sha256 of exact SCAN_PROMPT",
  "outputs": [{"id": "image-id", "sha256": "pixel hash", "model_output": {}}]
}
```

Expected labels never enter the model request or parser. Vial quantities require
explicit units; U-40 and ambiguous fill must refuse. No dose is derived from a
label. Existing dose-scenario fixtures test the downstream calculator separately.

Each run writes uniquely named JSON and Markdown under ignored `evals/results/`.
Reports include expected/got fields, refusal, latency, usage and cost, with
separate image/fixture summaries. Completed live responses are checkpointed to
ignored `evals/vision/.cache/`. API error logging is restricted to HTTP status and
a short allowlist of categories; keys, requests and pixels are not logged.

CI validates all labels, corpus copies and the grouped split lock, runs metadata
fixture checks, typecheck, vision tests, and offline eval without keys or pixels.
To run the blocking wrong-number check locally:

```sh
SAFEDOSE_EVAL_RECORDINGS=evals/vision/fixtures/development-recordings.json \
  npm run eval:vision -- --offline --gate-wrong-number
```

The committed fixture contains authored responses tied to synthetic development
IDs and image hashes. It covers insulin and standard syringe reads and an
explicit refusal. The check rejects empty fixtures and entries outside the
development split. It exits with status 1 when the replay exceeds the
wrong-number allowance in `thresholds.json`, currently zero.

`thresholds.json` retains Rodney's SAF-106 `approved-pending-labels` status.
Pending corpus labels cannot enforce an official gate, even with
`SAFEDOSE_EVAL_ENFORCE=1`. The diagnostic text fixture deliberately fails the
would-be zero-wrong-number gate. Complete SAF-166 before enabling a scored release.
