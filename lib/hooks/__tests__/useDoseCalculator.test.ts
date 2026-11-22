import { act, renderHook } from '@testing-library/react-native';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../../analytics';
import useDoseCalculator from '../useDoseCalculator';

jest.mock('../../analytics', () => ({
  ANALYTICS_EVENTS: { SAFETY_REFUSAL: 'safety_refusal', SCANNED_VALUE_EDIT: 'scanned_value_edit' },
  logAnalyticsEvent: jest.fn(),
}));
jest.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../useDoseLogging', () => ({ useDoseLogging: () => ({}) }));
jest.mock('../useOnboardingSurvey', () => ({ useOnboardingSurvey: () => ({}) }));
jest.mock('../usePowerUserPromotion', () => ({ usePowerUserPromotion: () => ({}) }));
jest.mock('../useBeforeFirstScanPrompt', () => ({ useBeforeFirstScanPrompt: () => ({}) }));
jest.mock('../useEvaluationDataCapture', () => ({
  useEvaluationDataCapture: () => ({ isCapturing: true }),
}));

const checkUsageLimit = async () => true;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

it('requires an explicit vial source for a new manual dose, even after a form reset', () => {
  const { result } = renderHook(() => useDoseCalculator({ checkUsageLimit }));

  act(() => result.current.resetFullForm());
  expect(result.current.medicationInputType).toBe('totalAmount');

  act(() => {
    result.current.setScreenStep('manualEntry');
    result.current.setDose('1.25');
  });
  act(() => result.current.handleNextDose());
  expect(result.current).toMatchObject({
    screenStep: 'manualEntry', manualStep: 'medicationSource',
    doseValue: 1.25, medicationInputType: null, formError: null,
  });

  act(() => result.current.handleNextMedicationSource());
  expect(result.current.manualStep).toBe('medicationSource');
  expect(result.current.formError).toMatch(/select how the medication amount is specified/i);

  act(() => result.current.setMedicationInputType('concentration'));
  act(() => result.current.handleNextMedicationSource());
  expect(result.current).toMatchObject({ manualStep: 'concentrationInput', formError: null });
});

it('keeps a confirmed result behind review when dose and concentration units change', () => {
  const { result } = renderHook(() => useDoseCalculator({ checkUsageLimit }));

  act(() => {
    result.current.setDose('1');
    result.current.setMedicationInputType('concentration');
    result.current.setConcentrationAmount('2');
    result.current.setManualSyringe({ type: 'Standard', volume: '1 ml' });
  });
  act(() => result.current.handleCalculateFinal());
  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current).toMatchObject({ manualStep: 'finalResult', calculatedVolume: 0.5 });

  act(() => {
    result.current.setUnit('mcg');
    result.current.setDose('1000');
    result.current.setConcentrationUnit('mcg/ml');
    result.current.setConcentrationAmount('4000');
  });
  expect(result.current).toMatchObject({
    manualStep: 'preDoseConfirmation', unit: 'mcg', doseValue: 1000,
    concentrationUnit: 'mcg/ml', calculatedVolume: 0.25, calculationError: null,
  });

  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current.manualStep).toBe('finalResult');
});

it('removes a previously reviewed draw when a smaller syringe cannot hold it and recovers on replacement', () => {
  const { result } = renderHook(() => useDoseCalculator({ checkUsageLimit }));

  act(() => {
    result.current.setDose('12');
    result.current.setMedicationInputType('concentration');
    result.current.setConcentrationAmount('10');
    result.current.setManualSyringe({ type: 'Standard', volume: '3 ml' });
  });
  act(() => result.current.handleCalculateFinal());
  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current).toMatchObject({ manualStep: 'finalResult', calculatedVolume: 1.2 });

  act(() => result.current.setManualSyringe({ type: 'Standard', volume: '1 ml' }));
  expect(result.current).toMatchObject({
    manualStep: 'preDoseConfirmation', calculatedVolume: null, recommendedMarking: null,
    guidance: null, showVolumeErrorModal: false,
  });
  expect(result.current.calculationError).toMatch(/exceeds syringe capacity/i);
  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current.manualStep).toBe('preDoseConfirmation');

  act(() => result.current.setManualSyringe({ type: 'Standard', volume: '3 ml' }));
  expect(result.current).toMatchObject({
    manualStep: 'preDoseConfirmation', calculatedVolume: 1.2, calculationError: null,
  });
  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current.manualStep).toBe('finalResult');
});

it('uses the exact planner handoff and recomputes strength when the solution volume is edited', () => {
  const { result } = renderHook(() => useDoseCalculator({ checkUsageLimit }));

  act(() => {
    result.current.setScreenStep('manualEntry');
    result.current.setDose('1');
    result.current.setTotalAmount('10');
    result.current.setTotalAmountUnit('mg');
    result.current.setSolutionVolume('3');
    result.current.setConcentrationExact('10/3');
    result.current.setTotalAmountHint('From reconstitution planner');
  });
  act(() => result.current.handleNextDose());
  act(() => result.current.setMedicationInputType('totalAmount'));
  act(() => result.current.handleNextMedicationSource());
  expect(result.current.manualStep).toBe('totalAmountInput');

  act(() => result.current.handleNextTotalAmountInput());
  expect(result.current.manualStep).toBe('syringe');
  act(() => result.current.handleCalculateFinal());
  expect(result.current).toMatchObject({
    manualStep: 'preDoseConfirmation', calculatedVolume: 0.3,
    calculatedConcentration: 10 / 3, calculationError: null,
  });

  act(() => result.current.setSolutionVolume('4'));
  expect(result.current).toMatchObject({
    manualStep: 'preDoseConfirmation', calculatedVolume: 0.4,
    calculatedConcentration: 2.5, calculationError: null,
  });
});

it('clears the previous dose, scan ownership, review, and error state on start over', () => {
  const { result } = renderHook(() => useDoseCalculator({ checkUsageLimit }));

  act(() => {
    result.current.setScreenStep('manualEntry');
    result.current.setDose('200');
    result.current.setUnit('mcg');
    result.current.setMedicationInputType('concentration');
    result.current.setSubstanceName('Scanned vial');
    result.current.setSubstanceNameHint('Detected from vial scan');
    result.current.setConcentrationAmount('1000');
    result.current.setConcentrationUnit('mcg/ml');
    result.current.setConcentrationHint('Detected from vial scan');
    result.current.setTotalAmount('10000');
    result.current.setTotalAmountUnit('mcg');
    result.current.setSolutionVolume('10');
    result.current.setTotalAmountHint('Detected from vial scan');
    result.current.setManualSyringe({ type: 'Insulin', volume: '1 ml' });
    result.current.setSyringeHint('Detected from image scan');
    result.current.registerScannedFields({ substanceName: 'Scanned vial' });
  });
  act(() => result.current.handleCalculateFinal());
  expect(result.current).toMatchObject({ manualStep: 'preDoseConfirmation', calculatedVolume: 0.2 });
  act(() => {
    result.current.setFormError('Previous form error');
    result.current.setCalculationError('Previous calculation error');
    result.current.setShowVolumeErrorModal(true);
    result.current.setVolumeErrorValue(0.2);
  });

  act(() => result.current.handleStartOver());
  expect(result.current).toMatchObject({
    screenStep: 'intro', manualStep: 'dose', dose: '', unit: 'mg', doseValue: null,
    substanceName: '', medicationInputType: 'totalAmount',
    concentrationAmount: '', concentrationUnit: 'mg/ml', concentration: null,
    totalAmount: '', totalAmountUnit: 'mg', solutionVolume: '',
    manualSyringe: { type: 'Standard', volume: '3 ml' },
    calculatedVolume: null, calculatedConcentration: null, recommendedMarking: null, guidance: null,
    calculationError: null, formError: null, showVolumeErrorModal: false, volumeErrorValue: null,
    substanceNameHint: null, concentrationHint: null, totalAmountHint: null, syringeHint: null,
  });

  act(() => result.current.setSubstanceName('New vial'));
  act(() => result.current.handleNextPreDoseConfirmation());
  expect(result.current.manualStep).toBe('dose');
  expect(logAnalyticsEvent).not.toHaveBeenCalledWith(
    ANALYTICS_EVENTS.SCANNED_VALUE_EDIT, { field: 'substanceName' },
  );
});
