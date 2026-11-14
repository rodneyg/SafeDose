import {
  calculateDose, CalculateDoseParams, parseInputNumber, parseScannedAmount,
  parseScannedConcentration, parseScannedSyringe, parsePlannerPrefill, parsePlannerScan,
  getReconstitutionInputError, getReconstitutionResult, getPlannerHandoff, calculateReconstitution, getSyringeMarkings, SyringeSelection,
  MAX_INJECTION_VOLUME_ML, formatDoseNumber, formatDrawToText,
} from '..';
import { Exact } from '../exact';

const base: CalculateDoseParams = {
  doseValue: 0.29, unit: 'mg', concentration: 1, concentrationUnit: 'mg/ml',
  manualSyringe: { type: 'Insulin', volume: '1 ml' },
};
const dose = (params: Partial<CalculateDoseParams>) => calculateDose({ ...base, ...params });

it.each(['', 'bad', '2 mg', '1.000,5', '1,00', 'NaN', 'Infinity', '1e3', '1,000,00'])('refuses ambiguous number %s', input => {
  expect(parseInputNumber(input)).toBeNaN();
});
it('refuses overflowed numeric input', () => {
  expect(parseInputNumber('9'.repeat(400))).toBeNaN();
});
it.each([['1,000', 1000], ['1,000.5', 1000.5], [' .29 ', 0.29], ['+1', 1], ['-1', -1]])('strict numeric input %s', (input, expected) => {
  expect(parseInputNumber(String(input))).toBe(expected);
});
it.each(['5000 mcg', '5,000 µg', '5000 μg', '5000 ug', '5,000 MCG'])('mass scan normalization %s', text => {
  expect(parseScannedAmount(text)).toEqual({ ok: true, value: { amount: 5000, unit: 'mcg' } });
});
it.each(['5 mg / mL', '5 MG/ML', '5 mg/ml'])('concentration spacing and case %s', text => {
  expect(parseScannedConcentration(text)).toEqual({ ok: true, value: { amount: 5, unit: 'mg/ml' } });
});
it.each(['5 mcg/mL', '5 µg/mL', '5 ug/mL'])('concentration micrograms %s', text => {
  expect(parseScannedConcentration(text)).toEqual({ ok: true, value: { amount: 5, unit: 'mcg/ml' } });
});
it.each(['100 units/mL', '100 u/ml'])('biological units %s', text => {
  expect(parseScannedConcentration(text)).toEqual({ ok: true, value: { amount: 100, unit: 'units/ml' } });
});
it.each(['', 'unreadable', '5000', '5 IU', '0 mg', '-1 mg', '1.000,5 mg', '5 mg/mL', '5 mg junk'])('invalid scanned amount %s', text => {
  expect(parseScannedAmount(text).ok).toBe(false);
});
it.each(['', 'unreadable', '5', '5 IU/mL', '0 mg/mL', '-1 mg/mL', '1.000,5 mg/mL'])('invalid scanned concentration %s', text => {
  expect(parseScannedConcentration(text).ok).toBe(false);
});
it('prefill requires explicit amount, unit, and volume', () => {
  expect(parsePlannerPrefill({}).ok).toBe(false);
  expect(parsePlannerPrefill({ prefillTotalAmount: '5' }).ok).toBe(false);
  for (const prefillSolutionVolume of [undefined, '', 'bad', '-1', '0']) {
    expect(parsePlannerPrefill({ prefillTotalAmount: '5', prefillTotalUnit: 'mg', prefillSolutionVolume }).ok).toBe(false);
  }
});
it('planner supports mass totals only and never substitutes concentration', () => {
  expect(parsePlannerScan({}).ok).toBe(false);
  expect(parsePlannerScan({ totalAmount: null, concentration: '5 mg/mL' }).ok).toBe(false);
  expect(parsePlannerScan({ totalAmount: '100 units' }).ok).toBe(false);
  expect(parsePlannerScan({ totalAmount: '5 mg' })).toEqual({ ok: true, value: { amount: 5, unit: 'mg' } });
});
it('missing or incompatible total unit blocks calculation', () => {
  for (const totalAmountUnit of [undefined, null, 'IU' as 'mg']) {
    expect(dose({ totalAmount: 5, totalAmountUnit }).calculationError).toContain('select the total amount unit');
  }
  expect(dose({ totalAmount: 5, totalAmountUnit: 'units' }).calculationError).toContain('incompatible');
  for (const totalAmount of [0, -1, NaN, Infinity]) {
    expect(dose({ totalAmount, totalAmountUnit: 'mg' }).calculationError).toContain('valid total amount');
  }
});
it('converts an mg total into mcg concentration units exactly', () => {
  expect(dose({ doseValue: 290, unit: 'mcg', concentration: null, concentrationUnit: 'mcg/ml', totalAmount: 1, totalAmountUnit: 'mg', solutionVolume: '1' }).recommendedMarking).toBe('29');
});
it.each(['bad', '1/0', '0', '-1', '1e400'])('invalid exact concentration %s', concentrationExact => {
  expect(dose({ concentrationExact }).calculationError).toContain('invalid exact concentration');
});
it('exact repeating concentration cancels before volume projection', () => {
  const result = dose({ doseValue: 0.5, concentration: null, concentrationExact: '5/3' });
  expect(result.calculatedVolume).toBe(0.3);
  expect(result.recommendedMarking).toBe('30');
});
it('repeating marking is stored exactly and rounded only when displayed', () => {
  const result = dose({ doseValue: 1, concentration: 3 });
  expect(result.recommendedMarking).toBe('100/3');
  expect(formatDrawToText({ syringeType: 'Insulin', recommendedMarking: result.recommendedMarking! })).toBe('Draw to 33.33 units');
});
it('planner mcg handoff retains concentration units and exact repeating BAC', () => {
  const plan = calculateReconstitution({ peptideAmountMg: 10, targetDoseMg: 0.3, preferredVolumeMl: 0.1 });
  expect(plan.bacWaterExact).toBe('10/3');
  const handoff = getPlannerHandoff(plan, 'mcg');
  expect(handoff.concentrationExact).toBe('3000');
  expect(dose({ doseValue: 300, unit: 'mcg', concentrationUnit: 'mcg/ml', totalAmount: 10000, totalAmountUnit: 'mcg', ...handoff }).recommendedMarking).toBe('10');
});
it('scan never guesses a syringe or scale', () => {
  for (const scan of [{}, { type: null }, { type: 'Standard' }, { type: 'Standard', volume: '9 ml' }, { type: 'Insulin', volume: '1 ml' }, { type: 'Insulin', volume: '1 ml', scale: 'U-500' }]) {
    expect(parseScannedSyringe(scan).ok).toBe(false);
  }
  expect(parseScannedSyringe({ type: 'Insulin', volume: '1ml', scale: 'u-100' })).toEqual({ ok: true, value: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' } });
  expect(parseScannedSyringe({ type: 'Insulin', volume: '1 ml', scale: 'U-40' }).ok).toBe(false);
  expect(parseScannedSyringe({ type: 'Insulin', volume: '1 ml', scale: 'U-100' }, 'U-40').ok).toBe(false);
  expect(parseScannedSyringe({ type: 'Insulin', volume: '0.3 ml', scale: 'U-40' }, 'U-40').ok).toBe(false);
  expect(parseScannedSyringe({ type: 'Insulin', volume: '0.5 ml', scale: 'U-40' }, 'U-40')).toEqual({ ok: true, value: { type: 'Insulin', volume: '0.5 ml', insulinScale: 'U-40' } });
});
it('unconfirmed syringe and unconfirmed scale block results', () => {
  for (const flag of ['needsConfirmation', 'needsScaleConfirmation']) {
    expect(dose({ manualSyringe: { ...base.manualSyringe!, [flag]: true } }).recommendedMarking).toBeNull();
  }
});
it.each([['0.5 ml', 0.5, '20'], ['1 ml', 1, '40']] as const)('U-40 capacity %s', (volume, doseValue, marking) => {
  const syringe = { type: 'Insulin' as const, volume, insulinScale: 'U-40' };
  const result = dose({ unit: 'mL', doseValue, manualSyringe: syringe });
  expect(result.recommendedMarking).toBe(marking);
  expect(result.calculationError).toBeNull();
  expect(getSyringeMarkings(syringe)?.split(',')).toHaveLength(Number(marking));
});
it('unsupported insulin scale and U-40 volume are refused', () => {
  expect(dose({ manualSyringe: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-500' } }).calculationError).toContain('Unsupported insulin scale');
  expect(dose({ manualSyringe: { type: 'Insulin', volume: '0.3 ml', insulinScale: 'U-40' } }).recommendedMarking).toBeNull();
  expect(getSyringeMarkings({ type: 'Insulin', volume: '1 ml', insulinScale: 'U-500' })).toBeUndefined();
  expect(getSyringeMarkings({ type: 'unknown', volume: '1 ml' } as unknown as SyringeSelection)).toBeUndefined();
});
it('2 mL policy is explicit, inclusive, and independent of syringe capacity', () => {
  expect(MAX_INJECTION_VOLUME_ML).toBe(2);
  for (const volume of ['3 ml', '5 ml']) {
    expect(dose({ unit: 'mL', doseValue: 2, manualSyringe: { type: 'Standard', volume } }).calculationError).toBeNull();
    expect(dose({ unit: 'mL', doseValue: 2.00001, manualSyringe: { type: 'Standard', volume } }).calculationError).toContain('2 mL per-injection safety limit');
  }
});
it('half-away-from-zero rounding is used only for display', () => {
  expect(formatDoseNumber(1.005, 2)).toBe('1.01');
  expect(formatDoseNumber(-1.005, 2)).toBe('-1.01');
  expect(formatDoseNumber(0.005, 3)).toBe('0.005');
  expect(dose({ unit: 'mL', doseValue: 0.005 }).recommendedMarking).toBe('0.5');
});
it('exact arithmetic handles signs, scientific input, repeating and finite decimals', () => {
  expect(new Exact('1/3').toString()).toBe('1/3');
  expect(new Exact('1/3').mul(3).toString()).toBe('1');
  expect(new Exact('1/-2').toString()).toBe('-0.5');
  expect(new Exact('-1').distance(new Exact(2)).toString()).toBe('3');
  expect(new Exact('0').toString()).toBe('0');
  expect(new Exact('1.25e2').toString()).toBe('125');
  expect(new Exact('1e-7').toString()).toBe('0.0000001');
  expect(new Exact('.25').toString()).toBe('0.25');
  expect(new Exact('-0.001').fixed(2)).toBe('0.00');
  expect(new Exact('1.5').fixed(0)).toBe('2');
  expect(new Exact(1e-308).toNumber()).toBe(1e-308);
  expect(new Exact(1e308).div(new Exact(1e308)).toNumber()).toBe(1);
  expect(() => new Exact('bad')).toThrow('Invalid exact number');
  expect(() => new Exact('.')).toThrow('Invalid exact number');
  expect(() => new Exact(1).div(0)).toThrow('Division by zero');
});

it('refuses input decimals whose digits would be lost at the numeric boundary', () => {
  expect(parseInputNumber('0.10000000000000001')).toBeNaN();
  expect(parseInputNumber('9007199254740993')).toBeNaN();
});
it('planner refuses numeric overflow and underflow without returning nonfinite results', () => {
  expect(() => calculateReconstitution({ peptideAmountMg: 10, targetDoseMg: 1e308, preferredVolumeMl: 1e-308 })).toThrow('Needs input');
  expect(() => calculateReconstitution({ peptideAmountMg: 1e308, targetDoseMg: 1e-308, preferredVolumeMl: 1 })).toThrow('Needs input');
});

it('entered planner input outside numeric range returns no result', () => {
  expect(getReconstitutionResult({ peptideAmount: '10', scannedPeptideAmount: null, peptideUnit: 'mg',
    targetDose: '1' + '0'.repeat(308), targetDoseUnit: 'mg', preferredVolume: '0.' + '0'.repeat(307) + '1' })).toBeNull();
});

it('concentration overflow and underflow return needs-input without nonfinite result fields', () => {
  for (const [totalAmount, solutionVolume] of [[1e308, '0.01'], [1e-308, '1' + '0'.repeat(308)]] as const) {
    const result = dose({ unit: 'units', concentrationUnit: 'units/ml', concentration: null, totalAmount, totalAmountUnit: 'units', solutionVolume });
    expect(result.calculationError).toContain('supported numeric range');
    expect(result.calculatedConcentration).toBeNull();
  }
  expect(dose({ concentrationExact: '1e-400' }).calculationError).toContain('invalid exact concentration');
});
it('planner BAC safety checks compare exact values before numeric projection', () => {
  const input = { peptideAmount: '5', scannedPeptideAmount: null, peptideUnit: 'mg' as const,
    targetDose: '250', targetDoseUnit: 'mcg' as const, preferredVolume: '0.1' };
  const plan = calculateReconstitution({ peptideAmountMg: 5, targetDoseMg: 0.25, preferredVolumeMl: 0.1 });
  expect(getReconstitutionInputError(input, { ...plan, bacWaterToAdd: 0.1, bacWaterExact: '0.0999999999999999999' })).toContain('less than 0.1');
  expect(getReconstitutionInputError(input, { ...plan, bacWaterToAdd: 20, bacWaterExact: '20.00000000000000001' })).toContain('more than 20');
});
