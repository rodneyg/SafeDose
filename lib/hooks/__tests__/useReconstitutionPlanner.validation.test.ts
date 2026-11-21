import { act, renderHook } from '@testing-library/react-native';
import { useReconstitutionPlanner } from '../useReconstitutionPlanner';

it.each(['0', '-0.1', '0.1mL'])('rejects preferred volume %s and recalculates after correction', (volume) => {
  const { result } = renderHook(useReconstitutionPlanner);
  act(() => {
    result.current.setInputMethod('manual');
    result.current.setPeptideAmount('5000');
    result.current.setPeptideUnit('mcg');
    result.current.setTargetDose('0.5');
    result.current.setTargetDoseUnit('mg');
    result.current.setPreferredVolume(volume);
  });
  act(() => result.current.proceedToOutput());

  expect(result.current.step).toBe('manualInput');
  expect(result.current.error).toBe('Please enter a valid preferred volume greater than 0');
  expect(result.current.result).toBeNull();

  act(() => result.current.setPreferredVolume('0.15'));
  act(() => result.current.proceedToOutput());

  expect(result.current.step).toBe('output');
  expect(result.current.error).toBeNull();
  expect(result.current.result).toMatchObject({
    bacWaterToAdd: 1.5,
    concentrationExact: '10/3',
    injectionVolume: 0.15,
  });
});

it.each([
  ['10.01', 'manualInput', /less than 0\.1 mL/],
  ['10', 'output', null],
  ['0.05', 'output', null],
  ['0.049', 'manualInput', /more than 20 mL/],
] as const)('validates the diluent bounds for a target dose of %s mg', (dose, step, error) => {
  const { result } = renderHook(useReconstitutionPlanner);
  act(() => {
    result.current.setInputMethod('manual');
    result.current.setPeptideAmount('10');
    result.current.setTargetDose(dose);
    result.current.setTargetDoseUnit('mg');
  });
  act(() => result.current.proceedToOutput());

  expect(result.current.step).toBe(step);
  if (error === null) {
    expect(result.current.error).toBeNull();
  } else {
    expect(result.current.error).toMatch(error);
  }
});
