import { act, renderHook } from '@testing-library/react-native';
import { useReconstitutionPlanner } from './useReconstitutionPlanner';

describe('useReconstitutionPlanner', () => {
  it('starts with planner defaults and selects each input method', () => {
    const { result } = renderHook(() => useReconstitutionPlanner());

    expect(result.current).toMatchObject({
      step: 'inputMethod',
      inputMethod: null,
      peptideAmount: '',
      peptideUnit: 'mg',
      targetDose: '',
      targetDoseUnit: 'mcg',
      preferredVolume: '0.1',
      scannedPeptideAmount: null,
      isProcessing: false,
      error: null,
      result: null,
    });

    act(() => result.current.setInputMethod('manual'));
    expect(result.current).toMatchObject({ inputMethod: 'manual', step: 'manualInput' });

    act(() => result.current.setInputMethod('scan'));
    expect(result.current).toMatchObject({ inputMethod: 'scan', step: 'scanLabel' });
  });

  it('calculates from manual values, converts units, and proceeds to output', () => {
    const { result } = renderHook(() => useReconstitutionPlanner());

    act(() => {
      result.current.setPeptideAmount('5');
      result.current.setPeptideUnit('mg');
      result.current.setTargetDose('250');
      result.current.setTargetDoseUnit('mcg');
      result.current.setPreferredVolume('0.1');
    });

    expect(result.current.result).toMatchObject({
      bacWaterToAdd: 2,
      concentration: 2.5,
      injectionVolume: 0.1,
    });
    expect(result.current.validateInputs()).toBe(true);

    act(() => result.current.proceedToOutput());
    expect(result.current.step).toBe('output');
    expect(result.current.error).toBeNull();
  });

  it('uses a scanned amount when manual amount is empty', () => {
    const { result } = renderHook(() => useReconstitutionPlanner());

    act(() => {
      result.current.setScannedPeptideAmount('10');
      result.current.setTargetDose('1');
      result.current.setTargetDoseUnit('mg');
      result.current.setPreferredVolume('0.2');
    });

    expect(result.current.result).toMatchObject({
      bacWaterToAdd: 2,
      concentration: 5,
      injectionVolume: 0.2,
    });
  });

  it.each([
    ['missing peptide amount', {}, 'Please enter a valid peptide amount greater than 0'],
    ['missing target dose', { peptideAmount: '5' }, 'Please enter a valid target dose greater than 0'],
    ['missing preferred volume', { peptideAmount: '5', targetDose: '1', preferredVolume: '0' }, 'Please enter a valid preferred volume greater than 0'],
    ['too little BAC water', { peptideAmount: '1', targetDose: '20', targetDoseUnit: 'mg', preferredVolume: '0.1' }, 'Target dose is too high for this vial size'],
    ['too much BAC water', { peptideAmount: '100', targetDose: '0.1', targetDoseUnit: 'mg', preferredVolume: '0.1' }, 'Target dose is too low for this vial size'],
  ])('keeps the current step and reports %s', (_name, values, expectedError) => {
    const { result } = renderHook(() => useReconstitutionPlanner());

    act(() => {
      if (values.peptideAmount !== undefined) result.current.setPeptideAmount(values.peptideAmount);
      if (values.targetDose !== undefined) result.current.setTargetDose(values.targetDose);
      if (values.targetDoseUnit !== undefined) result.current.setTargetDoseUnit(values.targetDoseUnit as 'mg');
      if (values.preferredVolume !== undefined) result.current.setPreferredVolume(values.preferredVolume);
    });
    act(() => result.current.proceedToOutput());

    expect(result.current.step).toBe('inputMethod');
    expect(result.current.error).toContain(expectedError);
  });

  it('clears errors when editing and restores defaults on reset', () => {
    const { result } = renderHook(() => useReconstitutionPlanner());

    act(() => {
      result.current.setError('scan failed');
      result.current.setIsProcessing(true);
    });
    expect(result.current).toMatchObject({ error: 'scan failed', isProcessing: true });

    act(() => result.current.setPeptideAmount('5'));
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.setStep('output');
      result.current.reset();
    });
    expect(result.current).toMatchObject({
      step: 'inputMethod',
      inputMethod: null,
      peptideAmount: '',
      peptideUnit: 'mg',
      targetDose: '',
      targetDoseUnit: 'mcg',
      preferredVolume: '0.1',
      scannedPeptideAmount: null,
      isProcessing: false,
      error: null,
      result: null,
    });
  });
});
