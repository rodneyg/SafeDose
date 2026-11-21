import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PreDoseConfirmationStep from './PreDoseConfirmationStep';
import ManualEntryScreen from './ManualEntryScreen';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    AlertTriangle: () => React.createElement(Text, { testID: 'icon-alert-triangle' }, 'AlertTriangle'),
    CheckCircle: () => React.createElement(Text, { testID: 'icon-check-circle' }, 'CheckCircle'),
    Info: () => React.createElement(Text, { testID: 'icon-info' }, 'Info'),
    ArrowRight: () => React.createElement(Text, { testID: 'icon-arrow-right' }, 'ArrowRight'),
  };
});

jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./CustomProgressBar', () => () => null);
jest.mock('./DoseInputStep', () => () => null);
jest.mock('./MedicationSourceStep', () => () => null);
jest.mock('./ConcentrationInputStep', () => () => null);
jest.mock('./TotalAmountInputStep', () => () => null);
jest.mock('./ReconstitutionStep', () => () => null);
jest.mock('./SyringeStep', () => () => null);
jest.mock('./FinalResultDisplay', () => () => null);
jest.mock('./DosingPresets', () => () => null);

describe('PreDoseConfirmationStep', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders verified summary details, scanned highlights, and safety reminder when there is no error', () => {
    const screen = render(
      <PreDoseConfirmationStep
        substanceName="Semaglutide"
        inputSummary={'Scanned strength: 2.5 mg/ml\nSyringe: Insulin 1 mL syringe (U-100)'}
        concentrationAmount="2.5"
        concentrationUnit="mg/ml"
        doseValue={0.5}
        unit="mg"
        calculatedVolume={0.2}
        calculatedConcentration={null}
        calculationError={null}
      />,
    );

    expect(screen.getByText('Verify Your Information')).toBeTruthy();
    expect(screen.getByTestId('icon-check-circle')).toBeTruthy();
    expect(screen.queryByTestId('icon-alert-triangle')).toBeNull();
    expect(screen.getByText('Semaglutide')).toBeTruthy();
    expect(screen.getByText('2.5 mg/ml')).toBeTruthy();
    expect(screen.getByText('0.5 mg')).toBeTruthy();
    expect(screen.getByText('Important Reminder')).toBeTruthy();

    const scannedLine = screen.getByText('Scanned strength: 2.5 mg/ml');
    const manualLine = screen.getByText('Syringe: Insulin 1 mL syringe (U-100)');
    expect(scannedLine.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#DBEAFE', color: '#1E40AF' })]),
    );
    expect(manualLine.props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: '#DBEAFE' })]),
    );
  });

  it('falls back to formatted calculatedConcentration when manual concentration is empty or zero, and hides missing rows', () => {
    const fallbackScreen = render(
      <PreDoseConfirmationStep
        substanceName="   "
        concentrationAmount="0"
        concentrationUnit="mg/ml"
        doseValue={null}
        unit="mg"
        calculatedVolume={null}
        calculatedConcentration={2.5}
        calculationError={null}
      />,
    );

    expect(fallbackScreen.queryByText('Compound:')).toBeNull();
    expect(fallbackScreen.queryByText('Requested Dose:')).toBeNull();
    expect(fallbackScreen.getByText('2.500 mg/ml')).toBeTruthy();

    const emptyConcentrationScreen = render(
      <PreDoseConfirmationStep
        substanceName=""
        concentrationAmount=""
        concentrationUnit="mg/ml"
        doseValue={1}
        unit="mL"
        calculatedVolume={1}
        calculatedConcentration={0}
        calculationError={null}
      />,
    );

    expect(emptyConcentrationScreen.queryByText('Concentration:')).toBeNull();
    expect(emptyConcentrationScreen.getByText('1 mL')).toBeTruthy();
  });

  it('shows warning state and strips internal VOLUME_THRESHOLD_ERROR prefix from calculationError', () => {
    const screen = render(
      <PreDoseConfirmationStep
        substanceName="Test Compound"
        concentrationAmount="10"
        concentrationUnit="mg/ml"
        doseValue={50}
        unit="mg"
        calculatedVolume={null}
        calculationError="VOLUME_THRESHOLD_ERROR: The 2 mL per-injection safety limit applies."
      />,
    );

    expect(screen.getByTestId('icon-alert-triangle')).toBeTruthy();
    expect(screen.queryByTestId('icon-check-circle')).toBeNull();
    expect(screen.getByText('The 2 mL per-injection safety limit applies.')).toBeTruthy();
    expect(screen.queryByText(/VOLUME_THRESHOLD_ERROR:/)).toBeNull();
  });

  describe('confirmation gating in ManualEntryScreen', () => {
    const createProps = (
      overrides: Partial<React.ComponentProps<typeof ManualEntryScreen>> = {},
    ): React.ComponentProps<typeof ManualEntryScreen> => ({
      manualStep: 'preDoseConfirmation',
      dose: '0.5',
      setDose: jest.fn(),
      unit: 'mg',
      setUnit: jest.fn(),
      substanceName: 'Test Compound',
      setSubstanceName: jest.fn(),
      medicationInputType: 'concentration',
      setMedicationInputType: jest.fn(),
      concentrationAmount: '2',
      setConcentrationAmount: jest.fn(),
      concentrationUnit: 'mg/ml',
      setConcentrationUnit: jest.fn(),
      totalAmountUnit: 'mg',
      setTotalAmountUnit: jest.fn(),
      totalAmount: '10',
      setTotalAmount: jest.fn(),
      solutionVolume: '',
      setSolutionVolume: jest.fn(),
      manualSyringe: { type: 'Standard', volume: '1 ml' },
      setManualSyringe: jest.fn(),
      doseValue: 0.5,
      calculatedVolume: 0.25,
      calculatedConcentration: null,
      recommendedMarking: '0.25',
      calculationError: null,
      guidance: null,
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
    });

    it('blocks confirmation when calculationError, missing calculatedVolume, or missing recommendedMarking is present', () => {
      const blockedCases: Partial<React.ComponentProps<typeof ManualEntryScreen>>[] = [
        { calculationError: 'Required volume exceeds syringe capacity (1 ml).' },
        { calculatedVolume: null },
        { recommendedMarking: null },
      ];

      for (const overrides of blockedCases) {
        const handleNextPreDoseConfirmation = jest.fn();
        const screen = render(
          <ManualEntryScreen
            {...createProps({ ...overrides, handleNextPreDoseConfirmation })}
          />,
        );

        const confirmButton = screen.getByLabelText('Proceed to result');
        expect(confirmButton.props.accessibilityState?.disabled ?? confirmButton.props.disabled).toBe(true);
        fireEvent.press(confirmButton);
        expect(handleNextPreDoseConfirmation).not.toHaveBeenCalled();
      }
    });

    it('allows confirmation when calculation succeeds, even when non-blocking guidance is shown', () => {
      const handleNextPreDoseConfirmation = jest.fn();
      const screen = render(
        <ManualEntryScreen
          {...createProps({
            guidance: 'Round to the nearest 0.05 mL marking.',
            handleNextPreDoseConfirmation,
          })}
        />,
      );

      const confirmButton = screen.getByLabelText('Proceed to result');
      expect(confirmButton.props.accessibilityState?.disabled ?? confirmButton.props.disabled).toBe(false);
      fireEvent.press(confirmButton);
      expect(handleNextPreDoseConfirmation).toHaveBeenCalledTimes(1);
    });
  });
});
