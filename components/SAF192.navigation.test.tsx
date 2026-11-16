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
  resetFullForm: jest.fn(),
  screenStep: 'manualEntry', manualStep: 'finalResult', stateHealth: 'healthy',
  manualSyringe: { type: 'Standard', volume: '3 ml' }, logUsageData: { plan: 'free' },
  recommendedMarking: '1 mL', calculatedVolume: 1, dose: '1', unit: 'mL',
}, { get: (target, key) => key in target ? target[key as keyof typeof target] : mockNoop });
// Return a new object every render, matching the actual hook's return identity.
jest.mock('../lib/hooks/useDoseCalculator', () => ({ __esModule: true, default: () => new Proxy({}, { get: (_, key) => mockCalculator[key as keyof typeof mockCalculator] }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { plan: 'free' } }) }));
jest.mock('../lib/hooks/useFeedbackStorage', () => ({ useFeedbackStorage: () => ({}) }));
jest.mock('../lib/hooks/useSignUpPrompt', () => ({ useSignUpPrompt: () => ({}) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({}) }));
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
  mockFocused = true;
  mockFocusRuns = 0;
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  (global as any).window = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
});
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); delete (global as any).window; });

it.each(['Reference', 'Log'])('immediately removes the result and modals when navigating to %s, then restores the result on return', () => {
  act(() => { renderer = create(<NewDoseScreen />); });
  expect(renderer.root.findByType('ManualEntryScreen' as any).props.manualStep).toBe('finalResult');
  const callsAfterMount = mockNoop.mock.calls.length;
  act(() => renderer.update(<NewDoseScreen />));
  expect(mockNoop.mock.calls.length).toBe(callsAfterMount);
  mockFocused = false;
  act(() => renderer.update(<NewDoseScreen />));
  expect(renderer.toJSON()).toBeNull();
  mockFocused = true;
  act(() => renderer.update(<NewDoseScreen />));
  expect(renderer.root.findByType('ManualEntryScreen' as any).props.manualStep).toBe('finalResult');
  expect(mockCalculator.resetFullForm).not.toHaveBeenCalled();
});
