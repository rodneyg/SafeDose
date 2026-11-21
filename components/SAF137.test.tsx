import React from 'react';
import { Platform } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import useDoseCalculator from '../lib/hooks/useDoseCalculator';
import ManualEntryScreen from './ManualEntryScreen';
import FinalResultDisplay from './FinalResultDisplay';
import { calculateDose } from '../lib/dosing';
import { getManualProgress } from '../lib/manualProgress';
import CustomProgressBar from './CustomProgressBar';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ScrollView: 'ScrollView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: 'Verify prescription' }) }));
const mockOfferSurvey = jest.fn();
const mockLogDose = jest.fn();
jest.mock('../lib/hooks/useOnboardingSurvey', () => ({ useOnboardingSurvey: () => ({ offerSurvey: mockOfferSurvey }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ logDose: mockLogDose }) }));
jest.mock('../lib/hooks/usePowerUserPromotion', () => ({
  usePowerUserPromotion: () => ({
    incrementDoseCount: async () => {},
    shouldShowPromotion: () => false,
    promotionData: { doseCount: 0 },
  }),
}));
jest.mock('../lib/hooks/useBeforeFirstScanPrompt', () => ({ useBeforeFirstScanPrompt: () => ({}) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({ isCapturing: true }) }));
jest.mock('./DoseInputStep', () => 'DoseInputStep');
jest.mock('./MedicationSourceStep', () => 'MedicationSourceStep');
jest.mock('./ConcentrationInputStep', () => 'ConcentrationInputStep');
jest.mock('./TotalAmountInputStep', () => 'TotalAmountInputStep');
jest.mock('./ReconstitutionStep', () => 'ReconstitutionStep');
jest.mock('./SyringeStep', () => 'SyringeStep');
jest.mock('./SyringeIllustration', () => 'SyringeIllustration');

let renderer: ReactTestRenderer;
beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
function hook() {
  let result: ReturnType<typeof useDoseCalculator>;
  function Probe() { result = useDoseCalculator({ checkUsageLimit: async () => true }); return null; }
  act(() => { renderer = create(<Probe />); });
  return () => result!;
}

it('keeps the feedback flow in place and offers the survey only after a successful save', async () => {
  const h = hook();
  mockLogDose.mockReset().mockResolvedValueOnce({ success: false })
    .mockResolvedValueOnce({ success: true, localDoseCount: 2 });
  mockOfferSurvey.mockClear();

  for (let i = 0; i < 2; i++) {
    act(() => h().handleGoToFeedback('start_over'));
    expect(h().screenStep).toBe('injectionSiteSelection');
    act(() => h().handleInjectionSiteSelected());
    expect(h().screenStep).toBe('postDoseFeedback');
    expect(mockOfferSurvey).not.toHaveBeenCalled();
    await act(async () => h().handleFeedbackComplete());
    expect(h().screenStep).toBe('intro');
  }

  expect(mockLogDose).toHaveBeenCalledTimes(2);
  expect(mockOfferSurvey).toHaveBeenCalledTimes(1);
  expect(mockOfferSurvey).toHaveBeenCalledWith(2, 'manual');
});

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

it('requires a compatible dose unit without relabeling a scanned concentration', () => {
  const h = hook();
  act(() => {
    h().setConcentrationAmount('10');
    h().setConcentrationUnit('mg/ml');
    h().registerScannedFields({ concentrationAmount: '10', concentrationUnit: 'mg/ml' });
    h().setUnit('units');
  });

  expect(h().concentrationUnit).toBe('mg/ml');
  act(() => h().handleNextConcentrationInput());
  expect(h().formError).toMatch(/incompatible units/i);
  expect(h().concentrationAmount).toBe('10');
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

it('SAF-109 hides the draw result until confirmation', () => {
  const h = hook();
  act(() => { h().setDose('0.2'); h().setUnit('mL'); });
  act(() => h().handleNextDose());
  act(() => h().handleCalculateFinal());
  expect(h().manualStep).toBe('preDoseConfirmation');
  act(() => { renderer.update(<ManualEntryScreen {...base as any} manualStep="preDoseConfirmation" />); });
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Volume to Draw');
});

it('SAF-109 confirmation is tied to the calculated inputs', () => {
  const h = hook();
  act(() => { h().setDose('0.2'); h().setUnit('mL'); });
  act(() => h().handleNextDose());
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).not.toBe('finalResult');
  act(() => h().handleCalculateFinal());
  act(() => h().setDose('0.3'));
  expect(h().manualStep).toBe('preDoseConfirmation');
  expect(h().calculatedVolume).toBe(0.3);
  expect(h().doseValue).toBe(0.3);
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).toBe('finalResult');
});

it('SAF-109 records each scanned edit and each repeated refusal without recording values', () => {
  const { logAnalyticsEvent } = jest.requireMock('../lib/analytics');
  logAnalyticsEvent.mockClear();
  const h = hook();
  act(() => {
    h().setConcentrationAmount('10');
    h().registerScannedFields({ concentrationAmount: '10' });
  });
  expect(logAnalyticsEvent).not.toHaveBeenCalled();
  act(() => h().setConcentrationAmount('12'));
  act(() => h().setConcentrationAmount('14'));
  const edits = logAnalyticsEvent.mock.calls.filter((call: any[]) => call[1]?.field);
  expect(edits).toHaveLength(2);
  expect(edits[0][1]).toEqual({ field: 'concentrationAmount' });
  act(() => h().handleCalculateFinal());
  act(() => h().handleCalculateFinal());
  expect(logAnalyticsEvent.mock.calls.filter((call: any[]) => call[1]?.stage === 'calculation')).toHaveLength(2);
});


it.each(['concentration', 'totalAmount'] as const)('keeps seven steps through forward and backward navigation on the %s path', inputType => {
  let state: ReturnType<typeof useDoseCalculator>;
  function Flow() {
    state = useDoseCalculator({ checkUsageLimit: async () => true });
    return <ManualEntryScreen {...state as any} />;
  }
  act(() => { renderer = create(<Flow />); });
  const steps = ['dose', 'medicationSource',
    ...(inputType === 'concentration' ? ['concentrationInput', 'totalAmountInput'] : ['totalAmountInput', 'reconstitution']),
    'syringe', 'preDoseConfirmation', 'finalResult'];
  const expectStep = (index: number) => {
    expect(state!.manualStep).toBe(steps[index]);
    const labels = renderer.root.findAllByType('Text' as any).map(node =>
      React.Children.toArray(node.props.children).join(''));
    expect(labels).toContain(`Step ${index + 1} of 7`);
    expect(labels.some(label => /Step \d+ of (6|8)/.test(label))).toBe(false);
    expect(renderer.root.findByType(CustomProgressBar).props).toEqual({ currentStep: index + 1, totalSteps: 7 });
    expect(getManualProgress(state!.manualStep, state!.medicationInputType)).toEqual({ currentStep: index + 1, totalSteps: 7 });
  };
  const next = (label = 'Next step') => {
    const button = renderer.root.findByProps({ accessibilityLabel: label });
    expect(button.props.disabled).toBe(false);
    act(() => button.props.onPress());
  };
  expectStep(0);
  act(() => { state!.setDose('5'); state!.setUnit('mg'); });
  next();
  expectStep(1);
  act(() => state!.setMedicationInputType(inputType));
  next();
  expectStep(2);
  if (inputType === 'concentration') {
    act(() => state!.setConcentrationAmount('10'));
    next();
    expectStep(3);
  }
  act(() => { state!.setTotalAmount('20'); state!.setTotalAmountUnit('mg'); });
  next();
  if (inputType === 'totalAmount') {
    expectStep(3);
    act(() => state!.setSolutionVolume('2'));
    next();
  }
  expectStep(4);
  act(() => state!.setManualSyringe({ type: 'Standard', volume: '1 ml' }));
  next('Calculate dose');
  expectStep(5);
  expect(state!.calculationError).toBeNull();
  const reviewText = renderer.root.findAllByType('Text' as any).map(node =>
    React.Children.toArray(node.props.children).join(''));
  const expectedStrength = inputType === 'concentration' ? '10' : '10.000';
  expect(reviewText).toContain(`Strength: ${expectedStrength} mg/ml`);
  expect(reviewText).toContain(`${expectedStrength} mg/ml`);
  next('Proceed to result');
  expectStep(6);
  for (let index = 5; index >= 0; index--) {
    act(() => state!.handleBack());
    expectStep(index);
  }
});

it.each([
  ['0', /invalid dose/i, false],
  ['0.000001', /outside safe thresholds/i, true],
  ['1000000000000000', /2 mL per-injection safety limit/i, true],
  ['1 mg', /invalid dose/i, false],
] as const)('keeps dose %s from reaching the draw result', (dose, error, showVolumeErrorModal) => {
  const h = hook();
  act(() => {
    h().setDose(dose);
    h().setMedicationInputType('concentration');
    h().setConcentrationAmount('10');
  });
  act(() => h().handleCalculateFinal());

  expect(h().calculationError).toMatch(error);
  expect(h().calculatedVolume).toBeNull();
  expect(h().recommendedMarking).toBeNull();
  expect(h().showVolumeErrorModal).toBe(showVolumeErrorModal);
  if (showVolumeErrorModal) act(() => h().handleCloseVolumeErrorModal());
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).toBe('preDoseConfirmation');
});

it.each([
  ['0', '1', 'mg', /invalid dose/i],
  ['1', '0', 'mg', /valid total amount/i],
  ['1', '10', 'units', /vial and concentration units are incompatible/i],
] as const)('clears a prior derived concentration before reviewing dose %s and vial %s %s', (dose, total, totalUnit, error) => {
  const h = hook();
  act(() => {
    h().setDose('1');
    h().setMedicationInputType('totalAmount');
    h().setTotalAmount('10');
    h().setSolutionVolume('2');
  });
  act(() => h().handleCalculateFinal());
  expect(h().calculatedConcentration).toBe(5);

  act(() => {
    h().setDose(dose);
    h().setTotalAmount(total);
    h().setTotalAmountUnit(totalUnit);
  });

  expect(h().calculationError).toMatch(error);
  expect(h().calculatedConcentration).toBeNull();
  expect(h().calculatedVolume).toBeNull();
  expect(h().recommendedMarking).toBeNull();
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).toBe('preDoseConfirmation');
});

it.each([
  ['', /enter a concentration amount/i],
  ['0', /valid concentration amount greater than 0/i],
  ['10mg', /valid concentration amount greater than 0/i],
] as const)('keeps concentration input %j on the strength step', (amount, error) => {
  const h = hook();
  act(() => {
    h().setManualStep('concentrationInput');
    h().setConcentrationAmount(amount);
  });
  act(() => h().handleNextConcentrationInput());
  expect(h().formError).toMatch(error);
  expect(h().manualStep).toBe('concentrationInput');
  expect(h().concentration).toBeNull();
});

it('requires the concentration unit at entry and confirmation', () => {
  const h = hook();
  act(() => {
    h().setManualStep('concentrationInput');
    h().setMedicationInputType('concentration');
    h().setDose('1');
    h().setConcentrationAmount('10');
    h().setNeedsConcentrationUnit(true);
  });
  act(() => h().handleNextConcentrationInput());
  expect(h().formError).toMatch(/select a concentration unit/i);
  expect(h().manualStep).toBe('concentrationInput');

  act(() => h().handleCalculateFinal());
  expect(h().calculationError).toMatch(/select the concentration unit/i);
  expect(h().recommendedMarking).toBeNull();
  act(() => h().handleNextPreDoseConfirmation());
  expect(h().manualStep).toBe('preDoseConfirmation');
});

it.each([
  ['', /enter the solution volume in mL/i],
  ['0', /valid solution volume greater than 0/i],
  ['1 ml', /valid solution volume greater than 0/i],
] as const)('keeps solution volume %j on the reconstitution step', (volume, error) => {
  const h = hook();
  act(() => {
    h().setManualStep('reconstitution');
    h().setSolutionVolume(volume);
  });
  act(() => h().handleNextReconstitution());
  expect(h().formError).toMatch(error);
  expect(h().manualStep).toBe('reconstitution');
});

it.each(['concentration', 'totalAmount'] as const)('reports required and invalid web inputs on the %s path', async inputType => {
  jest.replaceProperty(Platform, 'OS', 'web');
  let state!: ReturnType<typeof useDoseCalculator>;
  function Flow() {
    state = useDoseCalculator({ checkUsageLimit: async () => true });
    return <ManualEntryScreen {...state as any} />;
  }
  await act(async () => { renderer = create(<Flow />); });

  const next = () => {
    const button = renderer.root.findByProps({ accessibilityLabel: 'Next step' });
    expect(button.props.disabled).toBe(false);
    act(() => button.props.onPress());
  };
  const alerts = () => renderer.root.findAllByProps({ accessibilityRole: 'alert' })
    .map(node => node.props.children);
  const reject = (step: typeof state.manualStep, message: string) => {
    next();
    expect(state.manualStep).toBe(step);
    expect(alerts()).toEqual([message]);
  };

  reject('dose', 'Please enter a dose amount');
  act(() => state.setDose('1mg'));
  reject('dose', 'Please enter a valid dose amount greater than 0');
  act(() => state.setDose('0.5'));
  next();

  reject('medicationSource', 'Please select how the medication amount is specified on the vial label');
  act(() => state.setMedicationInputType(inputType));
  expect(alerts()).toEqual([]);
  next();

  if (inputType === 'concentration') {
    reject('concentrationInput', 'Please enter a concentration amount');
    act(() => state.setConcentrationAmount('0'));
    reject('concentrationInput', 'Please enter a valid concentration amount greater than 0');
    act(() => { state.setConcentrationAmount('2.5'); state.setNeedsConcentrationUnit(true); });
    reject('concentrationInput', 'Please select a concentration unit');
    act(() => {
      state.setConcentrationUnit('mg/ml');
      state.setTotalAmount('invalid');
      state.setTotalAmountHint('From reconstitution planner');
    });
    next();
    reject('totalAmountInput', 'Please enter a valid total amount greater than 0');
    act(() => state.setTotalAmount(''));
  }

  reject('totalAmountInput', 'Please enter the total amount in the vial');
  act(() => state.setTotalAmount('-5'));
  reject('totalAmountInput', 'Please enter a valid total amount greater than 0');
  act(() => { state.setTotalAmount('5'); state.setTotalAmountUnit(null); });
  reject('totalAmountInput', 'Needs input: select the total amount unit.');
  act(() => state.setTotalAmountUnit('mg'));
  next();

  if (inputType === 'totalAmount') {
    reject('reconstitution', 'Please enter the solution volume in mL');
    act(() => state.setSolutionVolume('2mL'));
    reject('reconstitution', 'Please enter a valid solution volume greater than 0');
    act(() => state.handleBack());
    next();
    expect(state.manualStep).toBe('reconstitution');
    expect(state.solutionVolume).toBe('2mL');
    act(() => state.setSolutionVolume('2'));
    next();
  }

  expect(state.manualStep).toBe('syringe');
  expect(alerts()).toEqual([]);
  act(() => state.setManualSyringe({ type: 'Standard', volume: '' }));
  expect(alerts()).toEqual(['Select a syringe size to calculate.']);
  expect(renderer.root.findByProps({ accessibilityLabel: 'Calculate dose' }).props.disabled).toBe(true);
});
