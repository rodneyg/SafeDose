import { act, renderHook } from '@testing-library/react-native';
import { useReconstitutionPlanner } from '../useReconstitutionPlanner';

it('keeps an incomplete manual entry on the input step and clears its error when edited', () => {
  const { result } = renderHook(useReconstitutionPlanner);
  act(() => result.current.setInputMethod('manual'));
  act(() => result.current.proceedToOutput());

  expect(result.current.step).toBe('manualInput');
  expect(result.current.error).toBe('Please enter a valid peptide amount greater than 0');
  expect(result.current.result).toBeNull();

  act(() => result.current.setPeptideAmount('5'));
  expect(result.current.error).toBeNull();

  act(() => result.current.proceedToOutput());
  expect(result.current.step).toBe('manualInput');
  expect(result.current.error).toBe('Please enter a valid target dose greater than 0');
});

it('uses the scanned amount, recomputes on a manual override, and resets the flow', () => {
  const { result } = renderHook(useReconstitutionPlanner);
  act(() => {
    result.current.setInputMethod('scan');
    result.current.setScannedPeptideAmount('5');
    result.current.setTargetDose('500');
  });

  expect(result.current.step).toBe('scanLabel');
  expect(result.current.result?.bacWaterToAdd).toBe(1);

  act(() => result.current.setPeptideAmount('10'));
  expect(result.current.result?.bacWaterToAdd).toBe(2);

  act(() => result.current.proceedToOutput());
  expect(result.current.step).toBe('output');

  act(() => result.current.reset());
  expect(result.current).toMatchObject({
    step: 'inputMethod',
    inputMethod: null,
    peptideAmount: '',
    scannedPeptideAmount: null,
    targetDose: '',
    preferredVolume: '0.1',
    result: null,
    error: null,
  });
});
