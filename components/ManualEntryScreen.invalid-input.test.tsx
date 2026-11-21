import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ManualEntryScreen from './ManualEntryScreen';

jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./CustomProgressBar', () => 'CustomProgressBar');
jest.mock('./MedicationSourceStep', () => 'MedicationSourceStep');
jest.mock('./ReconstitutionStep', () => 'ReconstitutionStep');
jest.mock('./SyringeStep', () => 'SyringeStep');
jest.mock('./PreDoseConfirmationStep', () => 'PreDoseConfirmationStep');
jest.mock('./FinalResultDisplay', () => 'FinalResultDisplay');
jest.mock('./DosingPresets', () => 'DosingPresets');

type TestedStep = 'dose' | 'concentrationInput' | 'totalAmountInput';

function renderStep(
  manualStep: TestedStep,
  value: string,
  overrides: Partial<React.ComponentProps<typeof ManualEntryScreen>> = {},
) {
  const props = {
    manualStep,
    dose: manualStep === 'dose' ? value : '5',
    setDose: jest.fn(),
    unit: 'mg',
    setUnit: jest.fn(),
    substanceName: '',
    setSubstanceName: jest.fn(),
    medicationInputType: 'concentration',
    setMedicationInputType: jest.fn(),
    concentrationAmount: manualStep === 'concentrationInput' ? value : '10',
    setConcentrationAmount: jest.fn(),
    concentrationUnit: 'mg/ml',
    setConcentrationUnit: jest.fn(),
    totalAmountUnit: 'mg',
    setTotalAmountUnit: jest.fn(),
    totalAmount: manualStep === 'totalAmountInput' ? value : '50',
    setTotalAmount: jest.fn(),
    solutionVolume: '5',
    setSolutionVolume: jest.fn(),
    manualSyringe: { type: 'Standard', volume: 1 },
    setManualSyringe: jest.fn(),
    doseValue: null,
    calculatedVolume: null,
    recommendedMarking: null,
    calculationError: null,
    formError: null,
    substanceNameHint: null,
    setSubstanceNameHint: jest.fn(),
    concentrationHint: null,
    setConcentrationHint: jest.fn(),
    totalAmountHint: null,
    setTotalAmountHint: jest.fn(),
    syringeHint: null,
    setSyringeHint: jest.fn(),
    handleNextDose: jest.fn(),
    handleNextMedicationSource: jest.fn(),
    handleNextConcentrationInput: jest.fn(),
    handleNextTotalAmountInput: jest.fn(),
    handleNextReconstitution: jest.fn(),
    handleCalculateFinal: jest.fn(),
    handleNextPreDoseConfirmation: jest.fn(),
    handleBack: jest.fn(),
    handleStartOver: jest.fn(),
    setScreenStep: jest.fn(),
    handleGoToFeedback: jest.fn(),
    lastActionType: 'manual',
    ...overrides,
  } as React.ComponentProps<typeof ManualEntryScreen>;

  return { screen: render(<ManualEntryScreen {...props} />), props };
}

describe('manual entry malformed input', () => {
  beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  it.each(['', '0', '-1', 'not a number', 'NaN', 'Infinity'])(
    'blocks malformed dose input %p and shows an error',
    value => {
      const { screen, props } = renderStep('dose', value);

      expect(screen.getByRole('alert').props.children).toBe('Enter a dose greater than zero.');
      fireEvent.press(screen.getByRole('button', { name: 'Next step' }));
      expect(props.handleNextDose).not.toHaveBeenCalled();
      expect(screen.UNSAFE_queryByType('FinalResultDisplay' as any)).toBeNull();
    },
  );

  it.each(['', '0', '-1', 'not a number', 'NaN', 'Infinity'])(
    'blocks malformed concentration input %p and shows an error',
    value => {
      const { screen, props } = renderStep('concentrationInput', value);

      expect(screen.getByRole('alert').props.children).toBe('Enter a concentration greater than zero.');
      fireEvent.press(screen.getByRole('button', { name: 'Next step' }));
      expect(props.handleNextConcentrationInput).not.toHaveBeenCalled();
      expect(screen.UNSAFE_queryByType('FinalResultDisplay' as any)).toBeNull();
    },
  );

  it.each(['', '0', '-1', 'not a number', 'NaN', 'Infinity'])(
    'blocks malformed total amount input %p and shows an error',
    value => {
      const { screen, props } = renderStep('totalAmountInput', value);

      expect(screen.getByRole('alert').props.children).toBe('Enter a total amount greater than zero.');
      fireEvent.press(screen.getByRole('button', { name: 'Next step' }));
      expect(props.handleNextTotalAmountInput).not.toHaveBeenCalled();
      expect(screen.UNSAFE_queryByType('FinalResultDisplay' as any)).toBeNull();
    },
  );

  it('blocks an incompatible concentration unit and shows the compatibility error', () => {
    const { screen, props } = renderStep('concentrationInput', '10', {
      unit: 'units',
      concentrationUnit: 'mg/ml',
    });

    expect(screen.getByRole('alert').props.children).toContain('Incompatible units');
    fireEvent.press(screen.getByRole('button', { name: 'Next step' }));
    expect(props.handleNextConcentrationInput).not.toHaveBeenCalled();
    expect(screen.UNSAFE_queryByType('FinalResultDisplay' as any)).toBeNull();
  });
});
