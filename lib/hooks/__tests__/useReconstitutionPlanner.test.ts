import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
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

it('restores the finished plan on return without pre-filling a new plan', async () => {
  await AsyncStorage.clear();
  const planner = renderHook(useReconstitutionPlanner);
  act(() => {
    planner.result.current.setInputMethod('manual');
    planner.result.current.setPeptideAmount('5');
    planner.result.current.setTargetDose('250');
  });
  expect(planner.result.current.lastCalculation).toBeNull();
  act(() => planner.result.current.proceedToOutput());
  planner.unmount();

  const restored = renderHook(useReconstitutionPlanner);
  await waitFor(() => expect(restored.result.current.lastCalculation).toEqual({
    vial: '5 mg', solutionVolume: '2.00 mL', dose: '250 mcg', draw: 'Draw 0.100 mL',
  }));
  expect(restored.result.current).toMatchObject({ targetDose: '', peptideAmount: '', result: null });
});
