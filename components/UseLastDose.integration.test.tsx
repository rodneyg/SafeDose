import React from 'react';
import { act, create } from 'react-test-renderer';
import NewDoseScreen from '../app/(tabs)/new-dose';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView', useCameraPermissions: () => [null, jest.fn()] }));
jest.mock('../lib/utils', () => ({ isWeb: false, isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/cameraUtils', () => ({}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
let mockFocused = true;
let mockFocusRuns = 0;
const mockNavigation = {};
const mockParams = {};
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => mockFocused }));
jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => any) => {
    const React = require('react');
    React.useEffect(() => {
      if (!mockFocused) return;
      if (++mockFocusRuns > 20) throw new Error('Focus effect is in a render loop');
      return callback();
    }, [callback, mockFocused]);
  },
}));
const mockNoop = jest.fn();
const mockCalculator = new Proxy({
  resetFullForm: jest.fn(), setSubstanceName: jest.fn(), setDose: jest.fn(), setUnit: jest.fn(), setConcentrationAmount: jest.fn(), setConcentrationUnit: jest.fn(), setMedicationInputType: jest.fn(),
  screenStep: 'intro', manualStep: 'dose', stateHealth: 'healthy',
  manualSyringe: { type: 'Standard', volume: '3 ml' }, logUsageData: { plan: 'free' },
  recommendedMarking: '1 mL', calculatedVolume: 1, dose: '1', unit: 'mL',
}, { get: (target, key) => key in target ? target[key as keyof typeof target] : mockNoop });
// Return a new object every render, matching the actual hook's return identity.
jest.mock('../lib/hooks/useDoseCalculator', () => ({ __esModule: true, default: () => new Proxy({}, { get: (_, key) => mockCalculator[key as keyof typeof mockCalculator] }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { plan: 'free' } }) }));
jest.mock('../lib/hooks/useFeedbackStorage', () => ({ useFeedbackStorage: () => ({}) }));
jest.mock('../lib/hooks/useSignUpPrompt', () => ({ useSignUpPrompt: () => ({}) }));
const mockHistory = jest.fn();
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ getDoseLogHistory: mockHistory }) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({}) }));
jest.mock('./IntroScreen', () => 'IntroScreen');
jest.mock('./BeforeFirstScanScreen', () => 'BeforeFirstScanScreen');
jest.mock('./ScanScreen', () => 'ScanScreen');
jest.mock('./ManualEntryScreen', () => 'ManualEntryScreen');
jest.mock('./WhyAreYouHereScreen', () => 'WhyAreYouHereScreen');
jest.mock('./InjectionSiteSelector', () => 'InjectionSiteSelector');
jest.mock('./PostDoseFeedbackScreen', () => 'PostDoseFeedbackScreen');
jest.mock('./PMFSurveyModal', () => 'PMFSurveyModal');
jest.mock('./LimitModal', () => 'LimitModal');
jest.mock('./LogLimitModal', () => 'LogLimitModal');
jest.mock('./VolumeErrorModal', () => 'VolumeErrorModal');
jest.mock('./ImagePreviewModal', () => 'ImagePreviewModal');
jest.mock('./SignUpPrompt', () => 'SignUpPrompt');

let renderer: ReturnType<typeof create>;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  (global as any).window = { navigator: { onLine: true }, addEventListener: jest.fn(), removeEventListener: jest.fn() };
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); delete (global as any).window; });

it('applies the most recent recorded dose to the editable form', async () => {
  mockHistory.mockResolvedValue([
    { substanceName: 'Example', doseValue: 2, unit: 'mg', calculatedVolume: 0.5,
      medicationInputType: 'concentration', concentrationAmount: '4', concentrationUnit: 'mg/ml' },
    { substanceName: 'Older', doseValue: 1, unit: 'mcg', calculatedVolume: 1 },
  ]);
  act(() => { renderer = create(<NewDoseScreen />); });
  let result: boolean | undefined;
  await act(async () => { result = await renderer.root.findByType('IntroScreen' as any).props.applyLastDose(); });
  expect(result).toBe(true);
  expect(mockCalculator.setSubstanceName).toHaveBeenCalledWith('Example');
  expect(mockCalculator.setDose).toHaveBeenCalledWith('2');
  expect(mockCalculator.setUnit).toHaveBeenCalledWith('mg');
  expect(mockCalculator.setMedicationInputType).toHaveBeenCalledWith('concentration');
  expect(mockCalculator.setConcentrationAmount).toHaveBeenCalledWith('4');
  expect(mockCalculator.setConcentrationUnit).toHaveBeenCalledWith('mg/ml');
});

it('does not apply a dose when history is empty', async () => {
  mockHistory.mockResolvedValue([]);
  act(() => { renderer = create(<NewDoseScreen />); });
  let result: boolean | undefined;
  await act(async () => { result = await renderer.root.findByType('IntroScreen' as any).props.applyLastDose(); });
  expect(result).toBe(false);
  expect(mockCalculator.setDose).not.toHaveBeenCalled();
  expect(mockCalculator.setSubstanceName).not.toHaveBeenCalled();
});
