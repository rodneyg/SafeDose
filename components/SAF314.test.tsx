import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import ManualEntryScreen from './ManualEntryScreen';
import FinalResultDisplay from './FinalResultDisplay';
import VolumeErrorModal from './VolumeErrorModal';
import SyringeIllustration from './SyringeIllustration';
import { calculateDose, syringeOptions } from '../lib/dosing';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ScrollView: 'ScrollView', Modal: 'Modal' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/googleAuth', () => ({ signInWithGoogle: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: 'Verify prescription' }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ logDose: jest.fn() }) }));
jest.mock('./CustomProgressBar', () => 'CustomProgressBar');
jest.mock('./DoseInputStep', () => 'DoseInputStep');
jest.mock('./MedicationSourceStep', () => 'MedicationSourceStep');
jest.mock('./ConcentrationInputStep', () => 'ConcentrationInputStep');
jest.mock('./TotalAmountInputStep', () => 'TotalAmountInputStep');
jest.mock('./ReconstitutionStep', () => 'ReconstitutionStep');
jest.mock('./SyringeStep', () => 'SyringeStep');

const base: React.ComponentProps<typeof ManualEntryScreen> = {
  manualStep: 'preDoseConfirmation', medicationInputType: 'concentration',
  concentrationAmount: '2', concentrationUnit: 'mg/ml', totalAmount: '10', totalAmountUnit: 'mg',
  solutionVolume: '', doseValue: 0.5, dose: '0.5', unit: 'mg', substanceName: '',
  manualSyringe: { type: 'Standard', volume: '1 ml' },
  calculatedVolume: 0.25, recommendedMarking: '0.25', calculationError: null,
} as React.ComponentProps<typeof ManualEntryScreen>;

let renderer: ReactTestRenderer;
beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });
const visibleText = () => renderer.root.findAllByType('Text' as any)
  .map(node => React.Children.toArray(node.props.children).join('')).join('\n');

it.each([50, 0.001])('shows a plain volume warning for %s mg and keeps Proceed disabled', doseValue => {
  const result = calculateDose({ doseValue, unit: 'mg', concentration: 10, concentrationUnit: 'mg/ml',
    totalAmount: 100, totalAmountUnit: 'mg', manualSyringe: { type: 'Standard', volume: '5 ml' } });
  expect(result.calculationError).toMatch(/^VOLUME_THRESHOLD_ERROR:/);
  const message = result.calculationError!.split(':')[1];
  act(() => { renderer = create(<ManualEntryScreen {...base} {...result} doseValue={doseValue} />); });
  expect(visibleText()).toContain(message);
  expect(visibleText()).not.toContain('VOLUME_THRESHOLD_ERROR:');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Proceed to result' }).props.disabled).toBe(true);
  act(() => renderer.update(<VolumeErrorModal visible message={result.calculationError} onClose={jest.fn()} onReEnterVialData={jest.fn()} />));
  expect(visibleText()).toContain(message);
  expect(visibleText()).not.toContain('VOLUME_THRESHOLD_ERROR:');
  act(() => renderer.update(<FinalResultDisplay {...base} {...result} handleStartOver={jest.fn()} setScreenStep={jest.fn()} handleGoToFeedback={jest.fn()} lastActionType="manual" isMobileWeb={false} />));
  expect(visibleText()).toContain(message);
  expect(visibleText()).not.toContain('VOLUME_THRESHOLD_ERROR:');
});

it('preserves ordinary error messages', () => {
  act(() => { renderer = create(<ManualEntryScreen {...base} calculationError="Dose value is invalid or missing." />); });
  expect(visibleText()).toContain('Dose value is invalid or missing.');
});

it.each(['', '5'])('hides unused solution volume on the concentration path, including stale value %s', solutionVolume => {
  act(() => { renderer = create(<ManualEntryScreen {...base} solutionVolume={solutionVolume} />); });
  expect(visibleText()).not.toContain('Solution volume:');
  expect(visibleText()).not.toContain('Not used mL');
  expect(visibleText()).toContain('Syringe: Standard 1 mL syringe (mL scale)');
  expect(visibleText()).not.toContain('ml mL scale');
});

it('shows solution volume when used for reconstitution', () => {
  act(() => { renderer = create(<ManualEntryScreen {...base} medicationInputType="totalAmount" solutionVolume="5" calculatedConcentration={2} />); });
  expect(visibleText()).toContain('Solution volume: 5 mL');
});

it('hides solution volume for a direct mL dose', () => {
  act(() => { renderer = create(<ManualEntryScreen {...base} medicationInputType="totalAmount" unit="mL" solutionVolume="5" />); });
  expect(visibleText()).not.toContain('Solution volume:');
});

it.each(['U-40', 'U-100', undefined])('preserves scanned syringe provenance and insulin scale %s', insulinScale => {
  act(() => { renderer = create(<ManualEntryScreen {...base} syringeHint="From scan" manualSyringe={{ type: 'Insulin', volume: '1 ml', insulinScale }} />); });
  expect(visibleText()).toContain(`Scanned syringe: Insulin 1 mL syringe (${insulinScale || 'U-100'})`);
});

it('formats a recurring marking as decimals throughout the result and illustration', () => {
  const manualSyringe = { type: 'Standard', volume: '1 ml' } as const;
  const result = calculateDose({ doseValue: 1, unit: 'mg', concentration: 3, concentrationUnit: 'mg/ml',
    totalAmount: 10, totalAmountUnit: 'mg', manualSyringe });
  expect(result.recommendedMarking).toBe('1/3');
  act(() => { renderer = create(<FinalResultDisplay {...base} {...result} manualSyringe={manualSyringe} doseValue={1} handleStartOver={jest.fn()} setScreenStep={jest.fn()} handleGoToFeedback={jest.fn()} lastActionType="manual" isMobileWeb={false} />); });
  expect(visibleText()).toContain('Draw to 0.33 ml');
  expect(visibleText()).not.toContain('1/3');
  act(() => renderer.update(<SyringeIllustration syringeType="Standard" syringeVolume="1 ml" recommendedMarking={result.recommendedMarking} syringeOptions={syringeOptions} />));
  expect(visibleText()).toContain('Draw to 0.33 ml');
  expect(visibleText()).not.toContain('1/3');
});
