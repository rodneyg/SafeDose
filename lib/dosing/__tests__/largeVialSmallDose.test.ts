import { getReconstitutionInputError, getReconstitutionResult, ReconstitutionInputs } from '../reconstitution';
import { parseInputNumber, parsePlannerScan, parseScannedAmount } from '../inputs';
import { getMarkingGuidance } from '../markings';
import { getSyringeMarkings } from '../syringes';

const base: ReconstitutionInputs = {
  peptideAmount: '', scannedPeptideAmount: null, peptideUnit: 'mg',
  targetDose: '', targetDoseUnit: 'mg', preferredVolume: '0.1',
};
const plan = (over: Partial<ReconstitutionInputs>) => {
  const input = { ...base, ...over };
  const result = getReconstitutionResult(input);
  return { result, error: getReconstitutionInputError(input, result) };
};
// Units drawn for a dose on an insulin syringe at a given scale (100 = U-100, 40 = U-40).
const unitsFor = (doseMg: number, concentration: number, scale: 100 | 40) =>
  Number(getMarkingGuidance(doseMg / concentration, 'Insulin', '1', scale).recommendedMarking);

describe('large vials accepted by the input parsers', () => {
  it.each(['100', '500', '1000', '1,000'])('parses a %s mg vial amount', (text) => {
    expect(parseScannedAmount(`${text} mg`)).toEqual({ ok: true, value: { amount: Number(text.replace(',', '')), unit: 'mg' } });
    expect(parsePlannerScan({ totalAmount: `${text} mg` })).toEqual({ ok: true, value: { amount: Number(text.replace(',', '')), unit: 'mg' } });
  });

  it.each(['0.25', '0.125', '.25', '250'])('parses a dose of %s', (text) => {
    expect(Number.isFinite(parseInputNumber(text))).toBe(true);
  });
});

describe('large vials in the reconstitution planner', () => {
  it.each([
    ['1000 mg vial, 50 mg dose', '1000', '50', 2, 500],
    ['500 mg vial, 25 mg dose', '500', '25', 2, 250],
    ['100 mg vial, 5 mg dose', '100', '5', 2, 50],
    ['100 mg vial, 0.25 mg dose at 0.01 mL', '100', '0.25', 4, 25, '0.01'],
  ])('%s', (_name, vial, dose, bac, concentration, volume = '0.1') => {
    const { result, error } = plan({ peptideAmount: vial, targetDose: dose, preferredVolume: volume });
    expect(error).toBeNull();
    expect(result?.bacWaterToAdd).toBeCloseTo(bac, 10);
    expect(result?.concentration).toBeCloseTo(concentration, 10);
  });

  it('accepts a scanned 1000 mg vial', () => {
    const { result, error } = plan({ scannedPeptideAmount: '1000', targetDose: '100' });
    expect(error).toBeNull();
    expect(result?.bacWaterToAdd).toBeCloseTo(1, 10);
  });

  it('keeps the 0.1 mL to 20 mL BAC water window: a 1000 mg vial with a 0.25 mg dose is rejected as too low', () => {
    const { result, error } = plan({ peptideAmount: '1000', targetDose: '0.25' });
    expect(result?.bacWaterToAdd).toBeCloseTo(400, 8);
    expect(error).toMatch(/too low for this vial size/);
  });
});

describe('quarter and sub-quarter mg doses', () => {
  it.each([
    ['0.25 mg', '0.25', 'mg'],
    ['0.125 mg', '0.125', 'mg'],
    ['250 mcg', '250', 'mcg'],
  ])('%s is accepted on a 5 mg vial', (_name, dose, unit) => {
    const { result, error } = plan({ peptideAmount: '5', targetDose: dose, targetDoseUnit: unit as 'mg' | 'mcg' });
    expect(error).toBeNull();
    expect(result?.concentration).toBeCloseTo(unit === 'mcg' ? 2.5 : Number(dose) / 0.1, 10);
  });

  it('treats 250 mcg and 0.25 mg as the same dose', () => {
    const mg = plan({ peptideAmount: '5', targetDose: '0.25' }).result;
    const mcg = plan({ peptideAmount: '5', targetDose: '250', targetDoseUnit: 'mcg' }).result;
    expect(mcg?.concentrationExact).toBe(mg?.concentrationExact);
    expect(mcg?.bacWaterExact).toBe(mg?.bacWaterExact);
  });

  it('accepts a 0.25 mg dose from a 5000 mcg vial entered in mcg', () => {
    const { result, error } = plan({ peptideAmount: '5000', peptideUnit: 'mcg', targetDose: '0.25' });
    expect(error).toBeNull();
    expect(result?.bacWaterToAdd).toBeCloseTo(2, 10);
  });
});

describe('units on the syringe', () => {
  it.each([
    ['0.25 mg at 2.5 mg/mL', 0.25, 2.5, 10, 4],
    ['0.125 mg at 2.5 mg/mL', 0.125, 2.5, 5, 2],
    ['0.25 mg at 5 mg/mL (250 mcg)', 0.25, 5, 5, 2],
    ['50 mg at 500 mg/mL (1000 mg vial)', 50, 500, 10, 4],
    ['25 mg at 250 mg/mL (500 mg vial)', 25, 250, 10, 4],
    ['5 mg at 50 mg/mL (100 mg vial)', 5, 50, 10, 4],
  ])('%s', (_name, dose, concentration, u100, u40) => {
    expect(unitsFor(dose, concentration, 100)).toBeCloseTo(u100, 10);
    expect(unitsFor(dose, concentration, 40)).toBeCloseTo(u40, 10);
  });

  it('gives the end to end units for a 1000 mg vial and a 50 mg dose on both scales', () => {
    const { result } = plan({ peptideAmount: '1000', targetDose: '50' });
    expect(unitsFor(50, result!.concentration, 100)).toBeCloseTo(10, 10);
    expect(unitsFor(50, result!.concentration, 40)).toBeCloseTo(4, 10);
  });

  it('the 0.125 mg dose lands on a U-40 whole-unit mark while U-100 has a 5 unit mark', () => {
    expect(getSyringeMarkings({ type: 'Insulin', volume: '1 ml', insulinScale: 'U-40' })?.split(',')).toContain('2');
    expect(getSyringeMarkings({ type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' })?.split(',')).toContain('10');
    expect(getMarkingGuidance(0.05, 'Insulin', '5,10,15', 100).precisionMessage).toBeNull();
    expect(getMarkingGuidance(0.05, 'Insulin', '1,2,3', 40).precisionMessage).toBeNull();
  });
});
