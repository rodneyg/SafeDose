# SAF-104 run report, 2026-11-16

Labels pending Rodney verification. No official accuracy claim or release gate.

## Delivered inventory

240 unique procedural PNG scenes are stored privately at
`/Users/rodneygainous/safedose-vision-private/images` (about 11 MiB). No pixels,
archives or binaries are included in this PR. The private directory has mode
0700. Repo artifacts contain hashes, relative paths, labels, source/license,
notes, split lock, scripts, and the automated review audit.

| Target | Provisional synthetic coverage | Remaining limitation |
| --- | --- | --- |
| 200+ images | 240 distinct scene hashes | Drawings, not independent real camera captures |
| 5+ syringe brands | BD, B. Braun, Terumo, Nipro, EasyTouch printed text | Illustrative names only, no verified real product appearance |
| All supported capacities | U-100 0.3/0.5/1 mL; U-40 0.5/1 mL; standard 1/3/5 mL | Real product variants still needed |
| 4 lighting / 3 angles | 60 per lighting; 80 per projected angle | Simplified procedural lighting and orthographic scale projection |
| 30+ unreadable | 40: 20 heavily blurred, 20 occluded | Human confirmation pending |
| 40+ vial labels | 240 paired vial scenes, 200 readable | Two fictional label designs, no real packaging diversity |
| Peptide / testosterone | 120 BPC-157 and 120 testosterone scenes | Includes 40 illegible labels with unknown reference facts |
| 20% holdout | 48 images, 8 complete sessions; 192 development | Custodian access controls and final release still pending |

[COVERAGE.md](COVERAGE.md) has split counts and the full configuration by brand
matrix. All six scenes per configuration/brand session share one split. Scene
variants are unique files but share a render template, limiting independence.
No prompt tuning occurred; no holdout model calls occurred. The shared app prompt
is unchanged. This corpus meets numerical synthetic coverage targets and does
not meet the real-photo or independent-human-review acceptance criteria.

## Ground truth and privacy

Generator geometry is labeler 1. A separately written checker is automated
labeler 2: it reconstructs fill from edge geometry, verifies pixel contrast at
the stopper, checks hashes, null handling, vial facts, and refusal expectations.
The result is **240/240 automated consistency agreement, zero disagreements**.
See `synthetic-review-audit.json`. This is not independent visual annotation.
Every strict label remains `review.status: pending`; manifest verification is
`pending-rodney`. SAF-166 remains the human verification work item.

ExifTool checked all 240 private images: zero EXIF/GPS/XMP/IPTC failures. A
20-image development contact sheet was visually inspected, including blurred
and occluded cases. No faces, tattoos, rings, patient names, pharmacy labels,
Rx numbers or addresses were present. The contact sheet and sample ID inventory
remain private. Synthetic scenes contain only generic bench artwork and fictional
vial label text, with no downloaded assets or personal data.

All new procedural art and labels are dedicated under CC0-1.0 to the extent
copyright applies. Brand trademarks and local font software are excluded.
No logo artwork is used. Font bytes are not redistributed. Pillow 11.3.0 and
local Arial rendered the corpus; the private render audit records the font hash.
The existing 111-row source/license manifest is preserved unchanged for later
materialization and review. None of its estimated photo labels were silently
promoted into this synthetic corpus or counted as new pixels.

## Evaluation results

```sh
npm run eval:vision -- --offline
SAFEDOSE_EVAL_IMAGES_DIR=/Users/rodneygainous/safedose-vision-private \
  npm run eval:vision -- --offline
```

Both offline modes pass. Private-store mode checks metadata and all 240 pixel
hashes before running. Image predictions observed: **0/240**, image field accuracy:
**not evaluated**. No predictions were fabricated from the ground truth.
The existing 12 text fixtures exercise `readScan`, `parseScanModelOutput`,
`mapScanToDoseInputs`, and the dose calculator: 4 exact, 7 refused/asked, 1
intentional wrong-number diagnostic. The would-be gate fails on that diagnostic;
enforcement is off because the corpus labels are pending. Fixtures and image
results have separate summaries in ignored `evals/results/*-offline.json`.

The development-only live run was configured for 12 images across scale/capacity
buckets, with model `gpt-4o-2024-08-06`, temperature 0, the frozen app prompt,
JSON-object responses and a 1,200-token output cap. The first request returned
**HTTP 401 `invalid_api_key`** before any completion. A second invocation exposed
only the sanitized status/category and confirmed the same error. There are
**zero live predictions**, no observed refusals, no live accuracy, no completion
latency measurements, and no live token usage. No additional key was available.
No env files, remote settings or credentials were changed.

**Combined OpenAI cost: $0.00.** Image generation used local procedural rendering.
Both API attempts were rejected with 401 and returned no billable completions.
For future successful calls, usage-based accounting requires explicit rates;
[$2.50 input / $10 output per million tokens](https://developers.openai.com/api/docs/models/gpt-4o?snapshot=gpt-4o-2024-08-06)
were verified in official OpenAI documentation for this attempt. This pinned model
is marked deprecated; model migration is outside SAF-104. The live runner caps
selection at 20 development images, reserves worst-case context cost before each
call to remain below $3 per invocation, disables retries, and checkpoints cost
and expected/got/refusal/latency data after each completed image. Cumulative job
spend must also be tracked by the operator.

## Validation

- `npm ci --ignore-scripts --no-audit --no-fund` completed with an engine warning
  on local Node 24.22.3 (the repo selects Node 22).
- `npm run check:vision-labeling`: 240 strict labels, corpus hash/split/copy checks,
  metadata fixture checks, and 20 labeling tests passed. The default repo image
  directory is intentionally empty.
- `npm run vision:check-exif -- /Users/rodneygainous/safedose-vision-private/images`:
  all 240 images passed.
- `python .../check-synthetic.py --store /Users/rodneygainous/safedose-vision-private`:
  240 checks passed with zero disagreements.
- `npm run typecheck:vision`: passed.
- `npm run test:vision`: 5 suites, 91 tests passed, including corpus quantity
  adaptation, split-lock tampering, duplicate pixels, inconsistent labels and
  development-only live selection.
- Offline eval passed both without a store and with the hash-checked private store.
- `git diff --check`: passed. No unrelated main test repairs were attempted.

## Still open

SAF-166 human review and independent label agreement; real product photography
across five brands; realistic lighting/angle/background variation and more vial
packaging; restricted custodian-managed holdout release; a valid externally
configured key and a successful frozen-prompt live baseline. Pending labels and
synthetic-only coverage cannot support marketing or clinical accuracy claims.
The public branch includes the unmerged SAF-104 labeling-spec commit `c64396d`
and merges current main for its scan request build fixes. PR only, no merge.
