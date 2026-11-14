import { calculateReconstitution, getReconstitutionResult, getReconstitutionInputError, ReconstitutionInputs } from '..';

const input: ReconstitutionInputs = {
  peptideAmount: '5', scannedPeptideAmount: null, peptideUnit: 'mg',
  targetDose: '250', targetDoseUnit: 'mcg', preferredVolume: '0.1',
};
const result = { bacWaterToAdd: 2, concentration: 2.5, injectionVolume: 0.1, bacWaterExact: '2', concentrationExact: '2.5' };

describe('current planner', () => {
  it('normal calculation', () => {
    expect(calculateReconstitution({ peptideAmountMg: 5, targetDoseMg: 0.25, preferredVolumeMl: 0.1 })).toEqual(result);
    expect(getReconstitutionResult(input)).toEqual(result);
    expect(getReconstitutionInputError(input, result)).toBeNull();
  });
  it('mcg peptide and mg dose conversions', () => {
    expect(getReconstitutionResult({ ...input, peptideAmount: '5000', peptideUnit: 'mcg', targetDose: '0.25', targetDoseUnit: 'mg' })).toEqual(result);
  });
  it('scan fallback', () => {
    expect(getReconstitutionResult({ ...input, peptideAmount: '', scannedPeptideAmount: '5' })).toEqual(result);
  });
  it.each(['', '0', 'bad'])('invalid peptide %s', peptideAmount => {
    const data = { ...input, peptideAmount };
    expect(getReconstitutionResult(data)).toBeNull();
    expect(getReconstitutionInputError(data, null)).toBe('Please enter a valid peptide amount greater than 0');
  });
  it.each(['', '0', 'bad'])('invalid dose %s', targetDose => {
    const data = { ...input, targetDose };
    expect(getReconstitutionResult(data)).toBeNull();
    expect(getReconstitutionInputError(data, null)).toBe('Please enter a valid target dose greater than 0');
  });
  it.each(['', '0', 'bad'])('invalid volume %s', preferredVolume => {
    const data = { ...input, preferredVolume };
    expect(getReconstitutionResult(data)).toBeNull();
    expect(getReconstitutionInputError(data, null)).toBe('Please enter a valid preferred volume greater than 0');
  });
  it.each(['peptideAmount', 'targetDose', 'preferredVolume'] as const)('negative %s produces no result', field => {
    const data = { ...input, [field]: '-1' };
    expect(getReconstitutionResult(data)).toBeNull();
    expect(getReconstitutionInputError(data, null)).not.toBeNull();
  });
  it('valid input with no result', () => {
    expect(getReconstitutionInputError(input, null)).toContain('Needs input');
  });
  it('scanned amount in validation', () => {
    expect(getReconstitutionInputError({ ...input, peptideAmount: '', scannedPeptideAmount: '5' }, result)).toBeNull();
  });
  it('less than 0.1 mL BAC', () => {
    expect(getReconstitutionInputError(input, { ...result, bacWaterToAdd: 0.09, bacWaterExact: '0.09' })).toBe('Target dose is too high for this vial size - would require less than 0.1 mL of BAC water. Try a smaller dose or larger injection volume.');
  });
  it('more than 20 mL BAC', () => {
    expect(getReconstitutionInputError(input, { ...result, bacWaterToAdd: 21, bacWaterExact: '21' })).toBe('Target dose is too low for this vial size - would require more than 20 mL of BAC water. Try a larger dose or smaller injection volume.');
  });
  it.each([0.1, 20])('inclusive BAC limit %s', bacWaterToAdd => {
    expect(getReconstitutionInputError(input, { ...result, bacWaterToAdd, bacWaterExact: String(bacWaterToAdd) })).toBeNull();
  });
  it('zero direct planner inputs are refused', () => {
    expect(() => calculateReconstitution({ peptideAmountMg: 5, targetDoseMg: 0, preferredVolumeMl: 0.1 })).toThrow('Needs input');
  });
});
