import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import useDoseCalculator from '../lib/hooks/useDoseCalculator';
import ManualEntryScreen from './ManualEntryScreen';
import FinalResultDisplay from './FinalResultDisplay';
import { calculateDose } from '../lib/dosing';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ScrollView: 'ScrollView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: 'Verify prescription' }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ logDose: jest.fn() }) }));
jest.mock('../lib/hooks/useWhyAreYouHereTracking', () => ({ useWhyAreYouHereTracking: () => ({}) }));
jest.mock('../lib/hooks/usePMFSurvey', () => ({ usePMFSurvey: () => ({}) }));
jest.mock('../lib/hooks/usePowerUserPromotion', () => ({ usePowerUserPromotion: () => ({}) }));
jest.mock('../lib/hooks/useBeforeFirstScanPrompt', () => ({ useBeforeFirstScanPrompt: () => ({}) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({ isCapturing: true }) }));
jest.mock('./DoseInputStep', () => 'DoseInputStep');
jest.mock('./MedicationSourceStep', () => 'MedicationSourceStep');
jest.mock('./ConcentrationInputStep', () => 'ConcentrationInputStep');
jest.mock('./TotalAmountInputStep', () => 'TotalAmountInputStep');
jest.mock('./ReconstitutionStep', () => 'ReconstitutionStep');
jest.mock('./SyringeStep', () => 'SyringeStep');
jest.mock('./SyringeIllustration', () => 'SyringeIllustration');
jest.mock('./CustomProgressBar', () => 'CustomProgressBar');

let renderer: ReactTestRenderer;
beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
function hook() {
  let result: ReturnType<typeof useDoseCalculator>;
  function Probe() { result = useDoseCalculator({ checkUsageLimit: async () => true }); return null; }
  act(() => { renderer = create(<Probe />); });
  return () => result!;
}

it.each([
  ['units', 'units/ml', '10', '100'],
  ['mg', 'mg/ml', '1', '10'],
  ['mcg', 'mg/ml', '100', '1'],
] as const)('dose %s advances, selects compatible concentration, and calculates exactly', (unit, concentrationUnit, dose, concentration) => {
  const h = hook();
  act(() => { h().setUnit(unit); h().setDose(dose); });
  expect(h().concentrationUnit).toBe(concentrationUnit);
  act(() => { expect(h().validateDoseInput(dose, unit)).toBe(true); h().handleNextDose(); });
  expect(h().formError).toBeNull();
  expect(h().manualStep).toBe('medicationSource');
  act(() => {
    h().setMedicationInputType('concentration');
    h().setConcentrationAmount(concentration);
    h().setManualSyringe({ type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' });
  });
  act(() => h().handleNextConcentrationInput());
  expect(h().formError).toBeNull();
  act(() => h().handleCalculateFinal());
  expect(h().calculationError).toBeNull();
  expect(h().calculatedVolume).toBe(0.1);
  expect(h().recommendedMarking).toBe('10');
});

it('switching units repairs incompatible state but concentration entry and calculation still reject mismatches', () => {
  const h = hook();
  act(() => { h().setUnit('units'); h().setDose('10'); });
  act(() => h().handleNextDose());
  act(() => { h().setConcentrationUnit('mg/ml'); h().setConcentrationAmount('100'); h().setConcentration(100); h().setMedicationInputType('concentration'); });
  act(() => { expect(h().validateConcentrationInput('100', 'mg/ml')).toBe(false); h().handleNextConcentrationInput(); });
  expect(h().formError).toBeTruthy();
  act(() => h().handleCalculateFinal());
  expect(h().calculationError).toBeTruthy();
  act(() => h().setUnit('mg'));
  expect(h().concentrationUnit).toBe('mg/ml');
  act(() => h().setConcentrationUnit('units/ml'));
  act(() => h().setUnit('mcg'));
  expect(h().concentrationUnit).toBe('mcg/ml');
});

it.each([
  [3, '3 ml'], [0.001, '1 ml'], [0.6, '0.5 ml'],
] as const)('hook rejects %s mL on %s and cannot advance', (dose, volume) => {
  const h = hook();
  act(() => { h().setUnit('mL'); h().setDose(String(dose)); h().setManualSyringe({ type: 'Standard', volume }); });
  act(() => h().handleNextDose());
  act(() => h().handleCalculateFinal());
  expect(h().calculationError).toBeTruthy();
  expect(h().calculatedVolume).toBeNull();
  expect(h().calculatedConcentration).toBeNull();
  expect(h().recommendedMarking).toBeNull();
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).toBe('preDoseConfirmation');
});

const base = {
  dose: '1', unit: 'mg', substanceName: 'Test', medicationInputType: 'concentration',
  concentrationAmount: '1', concentrationUnit: 'mg/ml', totalAmount: '', solutionVolume: '',
  manualSyringe: { type: 'Standard', volume: '3 ml' }, doseValue: 1,
  calculatedVolume: 1, calculatedConcentration: 1, recommendedMarking: '1',
  calculationError: null, formError: null, lastActionType: 'manual',
} as const;

it.each([
  ['over 2 mL', 3, '3 ml'], ['below floor', 0.001, '1 ml'], ['over capacity', 0.6, '0.5 ml'],
] as const)('%s clears outputs, disables Proceed and hides stale draw values in both views', (_, doseValue, volume) => {
  const result = calculateDose({ doseValue, unit: 'mL', concentration: null, concentrationUnit: 'mg/ml', totalAmount: null, manualSyringe: { type: 'Standard', volume } });
  expect(result.calculationError).toBeTruthy();
  expect(result.calculatedVolume).toBeNull();
  expect(result.calculatedConcentration).toBeNull();
  expect(result.recommendedMarking).toBeNull();
  const proceed = jest.fn();
  // Deliberately retain stale outputs: UI must guard independently of the calculator.
  const props = { ...base, calculationError: result.calculationError, handleNextPreDoseConfirmation: proceed };
  act(() => { renderer = create(<ManualEntryScreen {...props as any} manualStep="preDoseConfirmation" />); });
  const button = renderer.root.findByProps({ accessibilityLabel: 'Proceed to result' });
  expect(button.props.disabled).toBe(true);
  act(() => button.props.onPress());
  expect(proceed).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Volume to Draw');
  act(() => renderer.update(<FinalResultDisplay {...props as any} />));
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain('Calculation Error');
  expect(output).not.toContain('Draw to');
  expect(output).not.toContain('(Calculated volume:');
  expect(output).not.toContain('Calculation Breakdown');
});

it('between-mark guidance allows Proceed and a draw result', () => {
  const props = { ...base, guidance: 'Between marks: verify with your clinician.', handleNextPreDoseConfirmation: jest.fn() };
  act(() => { renderer = create(<ManualEntryScreen {...props as any} manualStep="preDoseConfirmation" />); });
  const button = renderer.root.findByProps({ accessibilityLabel: 'Proceed to result' });
  expect(button.props.disabled).toBe(false);
  act(() => button.props.onPress());
  expect(props.handleNextPreDoseConfirmation).toHaveBeenCalledTimes(1);
  act(() => renderer.update(<FinalResultDisplay {...props as any} />));
  expect(JSON.stringify(renderer.toJSON())).toContain('Draw to');
  expect(JSON.stringify(renderer.toJSON())).toContain(props.guidance);
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Unable to calculate volume');
});
