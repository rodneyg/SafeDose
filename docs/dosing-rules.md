# Dosing rules (SAF-101)

SAF-101 fixes the verified dosing defects on top of SAF-102 (#411). These are software rules and arithmetic examples, not prescribing recommendations. Fixture review by Rodney remains pending.

## Exact arithmetic and the display rule

`lib/dosing/exact.ts` uses reduced BigInt fractions. Input decimals, mg/mcg conversion, concentration, planner formulas, dose volume, availability comparisons, scale positions, and nearest-mark comparisons use exact arithmetic. A finite decimal is serialized without trailing zeros (`29`, `0.29`). A repeating decimal is serialized as a reduced fraction (`100/3`). No rounded planner value or displayed marking is used as a calculation input.

**One rounding rule: round half away from zero, only at display boundaries.** For example, `1.005` at two places is `1.01`, and `-1.005` is `-1.01`. The shared formatter implements this with integers rather than `Number.toFixed`.

| Display context | Decimal places |
| --- | ---: |
| Syringe marking, marking guidance, log draw text | 2 |
| Calculated dose volume and calculator concentration | 3 |
| Planner BAC water | 2 |
| Planner concentration and injection volume | 3 |
| Low-concentration validation message | 4 |
| Compact log concentration | 3 below 1; otherwise 1; strip trailing zeros |

Stored/logged `recommendedMarking` is always the exact canonical string, never the display-rounded number. The final view, illustration, and log draw text understand fractions, so `100/3` displays as `33.33`. Numeric result fields are compatibility projections to JavaScript numbers; repeating values cannot be represented exactly by that type. Those projections are never fed back into the current calculation. Planner handoff carries its exact concentration separately, in the explicit vial numerator unit. Editing the medication amount, unit, or solution volume invalidates that handoff value.

## Explicit units and input parsing

- Dose units: `mg`, `mcg`, `units`, `mL`.
- Concentration units: `mg/ml`, `mcg/ml`, `units/ml`.
- Every total amount has a separate explicit `totalAmountUnit`, including scans, planner prefills, and newly saved original-input logs. The manual total-amount step has an mg/mcg/units selector. Its label reflects the selected vial unit, independently of the dose unit.
- Convert mg and mcg exactly by a factor of 1000. Medication units cannot convert into mass units.
- Same-unit volume = dose / concentration. Convert the dose into the concentration numerator unit first when needed.
- Direct mL dose = entered volume; it does not require concentration or medication amount. Syringe, volume threshold, and capacity checks still apply.
- Strict numeric input accepts plain decimals and unambiguous thousands groups: `1,000` = 1000; `1,000.5` = 1000.5. `1.000,5`, numeric prefixes, nonfinite values, and malformed separators are rejected. Scientific notation is internal only, not accepted in entered/scanned text. Decimals that would lose digits at the numeric API boundary are refused instead of silently truncated.
- Normalize harmless case and whitespace, including `mg / mL`, `MG/ML`, `mcg/mL`, `µg/mL`, `μg/mL`, and `ug/mL`. `u/mL` and `units/mL` mean supported medication units. `IU/mL` is explicitly unsupported.
- Missing/unknown scanned units clear stale input and block the result with needs-input guidance through the existing error/hint display. An unknown concentration unit requires an explicit unit selection before proceeding. New scans clear the previous solution volume and medication inputs.
- A supplied concentration takes precedence over vial-derived concentration. In total-amount mode the UI clears/ignores stale supplied concentration. Missing concentration can be derived as converted vial total / solution volume.

## Planner and handoff

Only a total mass (`5 mg`, `1,000 mcg`) can fill the planner vial amount. A concentration (`5 mg/mL`) cannot substitute for a vial amount. Medication units are unsupported by the mass-based planner. Unreadable or ambiguous scans require manual input.

- Convert vial and target dose to mg.
- Required concentration = target dose mg / preferred injection volume mL.
- BAC water = vial amount mg / required concentration mg/mL.
- Injection volume = preferred volume.

All inputs must be positive and finite. The low-level calculator throws an explicit needs-input error for invalid arguments; the UI's validated planner returns no result for invalid entered values. BAC water must be between 0.1 and 20 mL inclusive. Planner handoff applies `prefillTotalUnit` and preserves the exact concentration. The rounded BAC display is never handed back as a calculation input. Example: 10 mg vial, 300 mcg target, 0.1 mL preferred volume gives concentration exactly 3 mg/mL, BAC exactly 10/3 mL, and U-100 marking exactly `10`.

## Syringes and insulin scales

Syringe scale units describe barrel positions. They do not convert arbitrary medications into biological insulin units.

| Type / scale | Capacity | Listed markings |
| --- | --- | --- |
| Insulin U-100 | 0.3 mL | 5–30, step 5 |
| Insulin U-100 | 0.5 mL | 5–50, step 5 |
| Insulin U-100 | 1 mL | 10–100, step 10 |
| Insulin U-40 | 0.5 mL | 1–20, step 1 |
| Insulin U-40 | 1 mL | 1–40, step 1 |
| Standard | 1 mL | 0.1–1, step 0.1 |
| Standard | 3 mL | 0.5–3, step 0.5 |
| Standard | 5 mL | 1–5, step 1 |

U-100 is the unchanged default for manual selections. U-40 uses 40 scale units/mL: 1 unit = 0.025 mL. The 1 mL U-40 option uses one-unit increments. U-40 0.3 mL syringes and other scales, including U-500, are refused. The scale selector and illustration use the selected scale. Saved logs retain the scale.

Scans must report a supported type, volume, and explicit insulin scale. No insulin scale is inferred from the dose or medication. An unreadable type/volume or missing, unsupported, or conflicting insulin scale requires selection. After an unreadable scan, type and volume must each be selected; an insulin scale must also be confirmed. The syringe step never silently replaces a scanned or user-selected syringe with a suggestion.

Standard marking = volume mL. Insulin marking = volume mL × selected units/mL. No result is snapped to a barrel marking. Guidance is emitted when the exact distance from the nearest mark exceeds 0.01 scale units. Ties select the earlier listed mark. Guidance describes between-marks, below-first, or above-last positions; built-in lists end at capacity, so the above-last helper is tested directly.

## Validation and results

1. Require a positive finite dose and compatible units.
2. If a vial total is supplied for a non-mL dose, require a supported explicit unit and a positive finite amount. Convert it into the concentration numerator's unit exactly.
3. Resolve exact handoff, supplied, or derived concentration; reject missing or invalid concentration for non-mL doses. Existing lower bounds for derived concentration remain: mg/mL >= 0.01 and mcg/mL >= 1. These checks do not apply to supplied concentration; no lower units/mL bound is introduced.
4. Require supported, confirmed syringe details and insulin scale.
5. Calculate exact volume. Preserve the inclusive 0.005–2 mL range. `MAX_INJECTION_VOLUME_ML = 2` is an explicit safety policy, independent of larger syringe capacity. Above-limit errors say the **2 mL per-injection safety limit applies**, including for 3/5 mL syringes. The volume modal preserves the blocking error after dismissal.
6. Reject insulin volumes above 1 mL, requested dose above the available medication, and volume above the selected syringe capacity. Availability errors label the vial's actual unit correctly.
7. Return `calculationError` only for blocking errors. Valid marking advice is returned in `guidance`; confirmation and final views display it without treating it as a failed calculation. Blocking errors prevent progression and saving.

The exported available-volume helper remains for defensive independent comparisons; exact dose availability makes the extra comparison redundant in the main calculator.

## Deterministic fixtures and verification

`tests/fixtures/generate_dosing_cases.py` computes arithmetic expectations independently using Python `fractions.Fraction`, without importing application code. Fixtures include the original 62 cases and a probe for each of the ten SAF-101 defects. Additional label-contract fixtures cover refused inputs. All carry `verified_by: "pending-rodney"`. The SAF-102 float-marking and direct-mL known-bug fixtures are now normal passing cases; no expected-failure fixtures remain.

Run `python3 tests/fixtures/generate_dosing_cases.py`, `npm run test:dosing`, and `npm run typecheck:dosing`. Coverage thresholds still require 100% statements, branches, functions, and lines in every production file under `lib/dosing/`. Full Jest and TypeScript failures are compared with the SAF-102 baseline; unrelated baseline problems are outside scope.

## SAF-103 property tests

`lib/dosing/__tests__/properties.test.ts` runs 26 properties with 1,000 cases each through both `npm test` and `npm run test:dosing`. The default seed is `1032026`; set `FC_SEED` to a signed 32-bit integer to use another seed. The runner reports the completed property run count. Failures include the seed, shrunk counterexample, shrink path, and a replay command using `FC_SEED`, `FC_PROPERTY`, and `FC_PATH`. An unknown property name or a path without a property name is an explicit error.

Generators use short entered decimals, doses from 1 mcg through 2,000 mg, solution volumes from 0.1 through 10 mL, all eight supported syringe selections, and safety/numeric edge values. Expected ratios and display rounding use independent BigInt cross-products rather than the production arithmetic. Properties cover exact conversions, linearity, mass-unit invariance, supplied/derived concentrations, planner handoff, monotonicity, rejection, numeric overflow/underflow, and display rounding/gradations.

Equivalence applies within the shared accepted domain. Existing derived-concentration lower bounds (0.01 mg/mL and 1 mcg/mL) do not apply to supplied concentration. A separate property preserves that policy difference. Numeric compatibility fields cannot represent repeating fractions exactly, so exact volume comparisons use the canonical marking and scale. Repeating planner BAC values require the existing exact concentration handoff; feeding only a rounded BAC number back into the total-amount path is not an exact invariant. Finite BAC values are also tested directly through that path.

Property counterexamples exposed numeric outputs on rejected calculations, including Infinity when finite dose/concentration operands overflowed. All calculator errors now return null volume, concentration, and marking. Error messages, thresholds, and valid results are preserved. Six new independent regression fixtures carry `verified_by: "pending-rodney"`; the existing SAF-101 above-limit fixture also expects null volume under this error contract.

## Open questions for Rodney

Should the 2 mL per-injection ceiling be raised for Standard 3/5 mL syringes, for example for IM injections? The ceiling remains unchanged pending a decision.
