# Current dosing rules (SAF-102)

This document characterizes `origin/main` at `370d568`. SAF-102 moves the existing math into `lib/dosing/` without changing numeric results, validation order, or displayed strings. These are software rules and arithmetic examples, not dosing recommendations. Known issues stay in place for SAF-101.

## Units and formulas

- Dose units: `mg`, `mcg`, `units`, `mL`.
- Concentration units: `mg/ml`, `mcg/ml`, `units/ml`.
- Same-unit volume: `dose / concentration` in mL.
- mcg dose with mg/mL: `(dose / 1000) / concentration`.
- mg dose with mcg/mL: `(dose * 1000) / concentration`.
- Direct mL dose: volume equals the entered dose, after the current concentration and syringe checks.
- Mass units can convert between mg and mcg. Medication units can only pair with units/mL. mL is compatible with every supported concentration unit.
- If concentration is null, NaN, zero, or negative, positive total amount and positive parsed solution volume can supply `concentration = totalAmount / solutionVolume`. Total amount is interpreted in the concentration numerator's units, without inferring or converting a separate vial unit. A supplied valid concentration takes precedence.

JavaScript number arithmetic and operation order are preserved. No decimal rounding is applied to calculations.

## Validation order and thresholds

1. Reject a null, NaN, zero, or negative dose.
2. Reject incompatible dose/concentration units.
3. Try deriving concentration. Solution volume uses `parseFloat`. Reject derived mg/mL concentration below `0.01` and derived mcg/mL concentration below `1`. There is no analogous lower units/mL check. These checks do not apply to supplied concentrations.
4. Reject a null, NaN, zero, or negative concentration, including for direct mL dosing.
5. Require syringe type, volume, and a recognized markings list.
6. Calculate volume. Reject volume below `0.005 mL` or above `2 mL`, using the `VOLUME_THRESHOLD_ERROR:` prefix. Both boundaries are inclusive.
7. Reject insulin syringe volumes above `1 mL`, before total-amount and capacity checks.
8. If total amount is supplied and the dose is not in mL, convert the dose into the concentration numerator's unit and reject a dose above total amount. Then compare volume with `totalAmount / concentration`.
9. Reject volume above the selected syringe capacity.
10. Return the raw exact marking string and, when applicable, precision guidance in `calculationError`.

The maximum-possible-volume check is defensive. For finite supported inputs, the preceding dose-amount comparison and monotonic division preclude a separate failure here. Its exported helper is tested directly with volume `1 mL`, total `5 mg`, concentration `10 mg/mL` (available volume `0.5 mL`).

## Syringes and marking guidance

Insulin marking = `volume mL * 100`. This assumes U-100 only. The number is a syringe scale position, not a conversion of an arbitrary medication's biological units.

| Syringe | Capacity | Listed markings |
| --- | --- | --- |
| Insulin | 0.3 mL | 5 through 30, step 5 |
| Insulin | 0.5 mL | 5 through 50, step 5 |
| Insulin | 1 mL | 10 through 100, step 10 |
| Standard | 1 mL | 0.1 through 1, step 0.1 |
| Standard | 3 mL | 0.5 through 3, step 0.5 |
| Standard | 5 mL | 1 through 5, step 1 |

Standard marking = volume in mL. `recommendedMarking` uses `Number.toString()` on the calculated scale value, rather than rounding to a listed mark. The nearest listed mark is used only for guidance. Ties select the earlier listed mark. Guidance is emitted when the absolute distance from the nearest mark is greater than `0.01` scale units. Text uses two decimals and identifies between-marks, below-first, or above-last positions. Built-in lists end at syringe capacity, so the above-last path is tested directly through the marking helper with a shorter list.

## Planner

Peptide amount uses the manual string first, then scanned amount, then `'0'`. Target dose and preferred volume use their entered strings. Parsing uses `parseFloat`. Peptide amount and target dose in mcg are each divided by `1000` to obtain mg.

- Required concentration = `targetDoseMg / preferredVolumeMl`.
- BAC water = `peptideAmountMg / requiredConcentration`.
- Injection volume = preferred volume.

Blank, zero, or NaN parsed inputs yield a null computed result. The separate validation step rejects nonpositive input and BAC water below `0.1 mL` or above `20 mL`; both boundaries are inclusive. The low-level arithmetic function itself does not validate inputs.

Planner output shows BAC water to two decimals, concentration to three, and injection volume to three. The calculator handoff also uses BAC water rounded to two decimals.

## Other display behavior

Dose-log draw text parses the stored marking and uses two decimals. Logged concentration is reconstructed as `doseValue / calculatedVolume` in the dose's unit per mL. It is hidden for mL doses or nonpositive/missing volume. Values below 1 use three decimals; others use one; trailing zeros and the decimal point are stripped. The last-dose fallback uses the same dose/volume ratio and raw `toString()`.

## Deterministic fixtures and verification

`tests/fixtures/dosing-cases.json` contains 62 arithmetic cases spanning peptide vial reconstitution, testosterone concentration, semaglutide/tirzepatide-style mg amounts, units/units, mcg/mcg, mg/mcg conversion, and direct mL doses. Each expected volume and marking was calculated independently with exact rational arithmetic in `tests/fixtures/generate_dosing_cases.py`; it imports no application code. Regenerate with `python3 tests/fixtures/generate_dosing_cases.py`.

All fixtures are `verified_by: "pending-rodney"`. Passing fixture tests do not represent independent owner review. Tests use exact equality and exact strings; the new tests use no approximate assertions. Two correct-value fixture assertions are `it.failing` until SAF-101. Explicit characterization tests also lock their current incorrect outputs.

Run `npm run test:dosing` for 100% statements, branches, functions, and lines, and `npm run typecheck:dosing` for strict isolated checking of the module and its tests. Coverage includes every production `.ts` file in the module; tests are excluded. Thresholds are scoped to the dosing path and do not apply to unrelated files in plain Jest runs.

## Known issues (SAF-101)

The numbered references below are local tracking labels used by these fixtures and this PR.

1. **Raw floating-point marking noise.** `29 units / 100 units/mL = 0.29 mL`, then multiplying by 100 produces the marking string `28.999999999999996`. Fixture `insulin-06` is marked `SAF-101 #1` and uses `it.failing` against the correct string `29`.
2. **Direct mL unnecessarily requires concentration.** A direct `0.5 mL` dose with no concentration fails before direct-volume calculation. Fixture `direct-no-concentration` is marked `SAF-101 #2` and uses `it.failing` against volume `0.5` and marking `0.5`.
3. **Permissive and nonfinite inputs.** Numeric prefixes such as `2.5 mg` parse successfully. Infinity is not rejected by the NaN/nonpositive checks. Infinity divided by Infinity can produce a successful result containing NaN and marking `NaN`. Negative planner inputs can produce a result before separate validation rejects them; the low-level planner permits Infinity/NaN from zero inputs. These outputs are characterized, not corrected.
4. **Total-amount error label in mg-to-mcg conversion.** When dose is mg and total is interpreted as mcg, the error labels the total amount as mg. Comparison arithmetic is preserved.
5. **Planner handoff rounding.** BAC water is rounded to two decimals before prefilling the calculator, which can change the resulting concentration and dose volume.

Precision guidance continues to share the `calculationError` field with blocking errors. Concentration lower-bound checks remain asymmetric between supplied and derived values. SAF-102 introduces no decisions about changing these policies.
