import React from 'react';
import { act, create } from 'react-test-renderer';
import NewDoseScreen from '../app/(tabs)/new-dose';
import modelOutputs from '../evals/vision/fixtures/model-outputs.json';
import wrongFills from '../evals/vision/fixtures/holdout-wrong-fills.json';
import { parseScanModelOutput } from '../lib/scan';

// Render the real dose screen. Child screens and unrelated services are boundaries;
// camera permission, stream ownership, cleanup, and transition effects run unchanged.
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('expo-camera', () => ({ CameraView: 'CameraView', useCameraPermissions: () => [null, jest.fn()] }));
jest.mock('../lib/utils', () => ({ isWeb: true, isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
const mockCapture = jest.fn();
jest.mock('../lib/cameraUtils', () => ({ captureAndProcessImage: (...args: any[]) => mockCapture(...args) }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { uid: 'guest-test' } }) }));
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
  onboardingSurvey: { prompt: null },
  resetFullForm: jest.fn(), setManualSyringe: jest.fn(), setTotalAmount: jest.fn(), setConcentrationAmount: jest.fn(), setSubstanceName: jest.fn(), setScreenStep: jest.fn(), handleCapture: jest.fn(async () => true),
  screenStep: 'intro', manualStep: 'finalResult', stateHealth: 'healthy',
  manualSyringe: { type: 'Standard', volume: '3 ml' }, logUsageData: { plan: 'free' },
  recommendedMarking: '1 mL', calculatedVolume: 1, dose: '1', unit: 'mL',
  setDose: jest.fn(), setDoseValue: jest.fn(), handleCalculateFinal: jest.fn(),
}, { get: (target, key) => key in target ? target[key as keyof typeof target] : mockNoop });
jest.mock('../lib/hooks/useDoseCalculator', () => ({ __esModule: true, default: () => mockCalculator }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { plan: 'free' } }) }));
jest.mock('../lib/hooks/useFeedbackStorage', () => ({ useFeedbackStorage: () => ({}) }));
jest.mock('../lib/hooks/useSignUpPrompt', () => ({ useSignUpPrompt: () => ({ trackInteraction: jest.fn() }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({}) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({ captureUserInteraction: jest.fn(async () => {}) }) }));
jest.mock('./IntroScreen', () => 'IntroScreen');
jest.mock('./BeforeFirstScanScreen', () => 'BeforeFirstScanScreen');
jest.mock('./ScanScreen', () => 'ScanScreen');
jest.mock('./ManualEntryScreen', () => 'ManualEntryScreen');
jest.mock('./InjectionSiteSelector', () => 'InjectionSiteSelector');
jest.mock('./PostDoseFeedbackScreen', () => 'PostDoseFeedbackScreen');
jest.mock('./LimitModal', () => 'LimitModal');
jest.mock('./LogLimitModal', () => 'LogLimitModal');
jest.mock('./VolumeErrorModal', () => 'VolumeErrorModal');
jest.mock('./ImagePreviewModal', () => 'ImagePreviewModal');
jest.mock('./SignUpPrompt', () => 'SignUpPrompt');


let renderer: ReturnType<typeof create>;
const mockGetUserMedia = jest.fn();
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
function stream() {
  const track = { stop: jest.fn(), getCapabilities: () => ({ torch: true }) };
  return { getTracks: () => [track], getVideoTracks: () => [track], track };
}
function navigate(step: string) {
  mockCalculator.screenStep = step;
  act(() => renderer.update(React.createElement(NewDoseScreen)));
}
async function settle() { await act(async () => {}); }
function camera() { return renderer.root.findByType('ScanScreen' as never); }

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockGetUserMedia.mockReset();
  mockGetUserMedia.mockRejectedValue(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
  mockCalculator.screenStep = 'intro';
  mockFocusRuns = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { navigator: { onLine: true }, addEventListener: jest.fn(), removeEventListener: jest.fn() } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: mockGetUserMedia } } });
  act(() => { renderer = create(React.createElement(NewDoseScreen)); });
});
afterEach(() => {
  act(() => renderer.unmount());
  jest.useRealTimers();
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

it('releases the initial stream and acquires exactly one fresh stream after feedback', async () => {
  const first = stream();
  const second = stream();
  mockGetUserMedia.mockResolvedValueOnce(first).mockResolvedValue(second);
  navigate('scan');
  await settle();
  expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  expect(mockGetUserMedia).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
  expect(camera().props.permissionStatus).toBe('granted');
  expect(camera().props.webCameraStream).toBe(first);
  navigate('manualEntry');
  expect(first.track.stop).toHaveBeenCalledTimes(1);
  navigate('postDoseFeedback');
  navigate('scan');
  await settle();
  await act(async () => { jest.advanceTimersByTime(200); });
  expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
  expect(camera().props.webCameraStream).toBe(second);
  expect(second.track.stop).not.toHaveBeenCalled();
  expect(camera().props.scanError).toBeNull();
  act(() => renderer.unmount());
  expect(second.track.stop).toHaveBeenCalledTimes(1);
});

it('keeps the existing stream across rerenders of an active scan', async () => {
  const active = stream();
  mockGetUserMedia.mockResolvedValue(active);
  navigate('scan');
  await settle();
  navigate('scan');
  await settle();
  expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  expect(camera().props.webCameraStream).toBe(active);
  expect(active.track.stop).not.toHaveBeenCalled();
});

it('shows denied permission without repeated automatic requests, and supports explicit retry', async () => {
  mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }));
  navigate('scan');
  await settle();
  expect(camera().props.permissionStatus).toBe('denied');
  expect(camera().props.mobileWebPermissionDenied).toBe(true);
  expect(camera().props.webCameraStream).toBeNull();
  navigate('scan');
  expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  const retry = stream();
  mockGetUserMedia.mockResolvedValue(retry);
  await act(async () => { await camera().props.requestWebCameraPermission(); });
  expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
  expect(camera().props.permissionStatus).toBe('granted');
  expect(camera().props.mobileWebPermissionDenied).toBe(false);
  expect(camera().props.webCameraStream).toBe(retry);
});

it('does not start another acquisition while camera permission is pending', async () => {
  let resolveStream: (value: ReturnType<typeof stream>) => void = () => {};
  mockGetUserMedia.mockImplementation(() => new Promise(resolve => { resolveStream = resolve; }));
  navigate('scan');
  navigate('scan');
  await act(async () => { await camera().props.requestWebCameraPermission(); });
  expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
  const active = stream();
  await act(async () => { resolveStream(active); });
  expect(camera().props.webCameraStream).toBe(active);
  expect(camera().props.permissionStatus).toBe('granted');
});


it.each(['Could not reach the scan service. Please try again.', 'We could not read the syringe size or vial strength safely.'])('keeps a failed scan visible and preserves the form: %s', async message => {
  navigate('scan');
  mockCapture.mockImplementationOnce(async (props: any) => {
    props.setScanError(message);
    return null;
  });
  await act(async () => { await camera().props.onCapture(); });
  expect(camera().props.scanError).toBe(message);
  expect(mockCalculator.setScreenStep).not.toHaveBeenCalled();
  expect(mockCalculator.setManualSyringe).not.toHaveBeenCalled();
  expect(mockCalculator.setTotalAmount).not.toHaveBeenCalled();
  expect(mockCalculator.setConcentrationAmount).not.toHaveBeenCalled();
  expect(mockCalculator.setSubstanceName).not.toHaveBeenCalled();
});

it('provides a visible fallback if capture returns no result or error', async () => {
  navigate('scan');
  mockCapture.mockResolvedValueOnce(null);
  await act(async () => { await camera().props.onCapture(); });
  expect(camera().props.scanError).toMatch(/could not read this photo/i);
  expect(mockCalculator.setScreenStep).not.toHaveBeenCalled();
});

it('keeps unexpected capture failures visible without navigating to Manual', async () => {
  navigate('scan');
  mockCapture.mockRejectedValueOnce(new Error('unexpected transport failure'));
  await act(async () => { await camera().props.onCapture(); });
  expect(camera().props.scanError).toMatch(/could not process this photo/i);
  expect(mockCalculator.setScreenStep).not.toHaveBeenCalled();
});

it('shows a successful scan in the image preview', async () => {
  navigate('scan');
  const result = { syringe: {}, vial: {}, capturedImage: { uri: 'data:image/jpeg;base64,test', mimeType: 'image/jpeg' } };
  mockCapture.mockResolvedValueOnce(result);
  await act(async () => { await camera().props.onCapture(); });
  const preview = renderer.root.findByType('ImagePreviewModal' as never);
  expect(preview.props.visible).toBe(true);
  expect(mockCalculator.setScreenStep).not.toHaveBeenCalled();
});


it.each(wrongFills)('requires explicit review before applying accepted capture %#, even without an image', async raw => {
  navigate('scan');
  mockCapture.mockResolvedValueOnce(parseScanModelOutput(raw));
  await act(async () => { await camera().props.onCapture(); });
  const preview = renderer.root.findByType('ImagePreviewModal' as never);
  expect(preview.props.visible).toBe(true);
  expect(preview.props.imageUri).toBe('');
  expect(mockCalculator.setScreenStep).not.toHaveBeenCalled();
  expect(mockCalculator.setConcentrationAmount).not.toHaveBeenCalled();
  expect(mockCalculator.setDose).not.toHaveBeenCalled();
  expect(mockCalculator.handleCalculateFinal).not.toHaveBeenCalled();

  act(() => { preview.props.onVerify(); });
  expect(preview.props.visible).toBe(false);
  expect(mockCalculator.setScreenStep).toHaveBeenCalledWith('manualEntry');
  expect(mockCalculator.setConcentrationAmount).toHaveBeenCalledWith(
    JSON.parse(raw).vial.concentration.split(' ')[0],
  );
  expect(mockCalculator.setDose.mock.calls).toEqual([['']]);
  expect(mockCalculator.setDoseValue.mock.calls).toEqual([[null]]);
  expect(mockCalculator.handleCalculateFinal).not.toHaveBeenCalled();
});

it('requires a fresh syringe selection when the scanned capacity exceeds the visible scale', async () => {
  // Capacity and marks come from development validation cases c2-b0-s1 and c1-b0-s1.
  const output = modelOutputs[0].model_output;
  const raw = JSON.stringify({ ...output, syringe: { ...output.syringe, markings: '0,10,20,30,40,50' } });
  navigate('scan');
  mockCapture.mockResolvedValueOnce(parseScanModelOutput(raw));
  await act(async () => { await camera().props.onCapture(); });
  const preview = renderer.root.findByType('ImagePreviewModal' as never);
  expect(preview.props.visible).toBe(true);
  expect(mockCalculator.setManualSyringe).not.toHaveBeenCalled();

  act(() => { preview.props.onVerify(); });
  expect(preview.props.visible).toBe(false);
  expect(mockCalculator.resetFullForm).toHaveBeenCalledWith('dose');
  expect(mockCalculator.setManualSyringe.mock.calls).toEqual([[{ type: 'Standard', volume: '', needsConfirmation: true }]]);
  expect(mockCalculator.setScreenStep).toHaveBeenCalledWith('manualEntry');
  expect(mockCalculator.setConcentrationAmount).not.toHaveBeenCalled();
  expect(mockCalculator.handleCalculateFinal).not.toHaveBeenCalled();
});
