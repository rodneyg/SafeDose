import React from 'react';
import '@testing-library/react-native/extend-expect';
import { act, fireEvent, render, type RenderResult } from '@testing-library/react-native';
import NewDoseScreen from '../app/(tabs)/new-dose';
import type { DoseLog, InjectionSite } from '../types/doseLog';

type ScreenStep = 'intro' | 'scan' | 'manualEntry' | 'injectionSiteSelection';

// Render the real dose screen, scanner, and injection-site picker.
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('expo-camera', () => ({ useCameraPermissions: () => [null, jest.fn()] }));
jest.mock('../lib/utils', () => ({ isWeb: true, isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/cameraUtils', () => ({}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));

const mockNavigation = {};
const mockParams = {};
jest.mock('expo-router', () => ({
  useNavigation: () => mockNavigation,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof React>('react');
    useEffect(callback, [callback]);
  },
}));

const mockNoop = jest.fn();
const mockGetDoseLogHistory = jest.fn();
const mockConfirmSite = jest.fn();
const mockSelectSite = jest.fn();
let mockInitialStep: ScreenStep;
let mockSetScreenStep: (step: ScreenStep) => void;
jest.mock('../lib/hooks/useDoseCalculator', () => ({
  __esModule: true,
  default: function useDoseCalculator() {
    const { useCallback, useState } = jest.requireActual<typeof React>('react');
    const [screenStep, setScreenStep] = useState(mockInitialStep);
    const [selectedInjectionSite, setSelectedInjectionSite] = useState<InjectionSite | null>(null);
    const selectSite = useCallback((site: InjectionSite) => {
      mockSelectSite(site);
      setSelectedInjectionSite(site);
    }, []);
    mockSetScreenStep = setScreenStep;
    return new Proxy({
      screenStep,
      setScreenStep,
      selectedInjectionSite,
      setSelectedInjectionSite: selectSite,
      handleInjectionSiteSelected: mockConfirmSite,
      onboardingSurvey: { prompt: null },
      manualStep: 'dose',
      stateHealth: 'healthy',
      logUsageData: { plan: 'free' },
    }, { get: (target, key) => key in target ? target[key as keyof typeof target] : mockNoop });
  },
}));
jest.mock('../lib/hooks/useDoseLogging', () => ({
  useDoseLogging: () => ({ getDoseLogHistory: mockGetDoseLogHistory }),
}));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { plan: 'free' } }) }));
jest.mock('../lib/hooks/useFeedbackStorage', () => ({ useFeedbackStorage: () => ({}) }));
jest.mock('../lib/hooks/useSignUpPrompt', () => ({ useSignUpPrompt: () => ({}) }));
jest.mock('../lib/hooks/useEvaluationDataCapture', () => ({ useEvaluationDataCapture: () => ({}) }));
jest.mock('./IntroScreen', () => 'IntroScreen');
jest.mock('./BeforeFirstScanScreen', () => 'BeforeFirstScanScreen');
jest.mock('./ManualEntryScreen', () => 'ManualEntryScreen');
jest.mock('./PostDoseFeedbackScreen', () => 'PostDoseFeedbackScreen');
jest.mock('./LimitModal', () => 'LimitModal');
jest.mock('./LogLimitModal', () => 'LogLimitModal');
jest.mock('./VolumeErrorModal', () => 'VolumeErrorModal');
jest.mock('./ImagePreviewModal', () => 'ImagePreviewModal');
jest.mock('./SignUpPrompt', () => 'SignUpPrompt');

let screen: RenderResult;
const mockGetUserMedia = jest.fn();
const originalGlobals = ['navigator', 'window'].map(key =>
  [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
);

function mount(step: ScreenStep) {
  mockInitialStep = step;
  screen = render(<NewDoseScreen />);
}

function navigate(step: ScreenStep) {
  act(() => mockSetScreenStep(step));
}

async function settle() {
  await act(async () => {});
}

function stream() {
  const track = { stop: jest.fn(), getCapabilities: () => ({}) };
  return { getTracks: () => [track], getVideoTracks: () => [track] };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUserMedia.mockReset();
  mockGetDoseLogHistory.mockReset();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { navigator: { onLine: true }, addEventListener: jest.fn(), removeEventListener: jest.fn() },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: mockGetUserMedia } },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError'])(
  'offers photo upload and an explicit camera retry after %s',
  async name => {
    mockGetUserMedia.mockRejectedValueOnce(Object.assign(new Error('Camera unavailable'), { name }));
    mount('scan');
    await settle();

    expect(screen.getByText(/Camera access was denied.*uploading a photo/)).toBeVisible();
    expect(screen.getByText('Take or Upload Photo')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Capture photo' })).toBeNull();
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1);

    const retry = stream();
    mockGetUserMedia.mockResolvedValueOnce(retry);
    fireEvent.press(screen.getByText('Try Camera Again'));
    await settle();

    expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Camera access was denied/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Capture photo' })).toBeEnabled();
    fireEvent.press(screen.getByText('Manual Entry'));
    expect(screen.getByText('Enter Dose')).toBeVisible();
  },
);

it.each(['empty', 'failed'] as const)(
  'clears stale site history and keeps site selection usable when reloaded history is %s',
  async outcome => {
    mockGetDoseLogHistory.mockResolvedValueOnce([{
      injectionSite: 'abdomen_L',
      timestamp: new Date().toISOString(),
    }]);
    mount('injectionSiteSelection');
    await settle();
    expect(screen.getByText('Today')).toBeVisible();

    navigate('manualEntry');
    if (outcome === 'empty') {
      mockGetDoseLogHistory.mockResolvedValueOnce([]);
    } else {
      mockGetDoseLogHistory.mockRejectedValueOnce(new Error('History unavailable'));
    }
    navigate('injectionSiteSelection');
    await settle();

    expect(mockGetDoseLogHistory).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Choose where you'll inject/)).toBeVisible();
    expect(screen.queryByText('Today')).toBeNull();
    expect(screen.queryByText(/Consider rotating/)).toBeNull();
    fireEvent.press(screen.getByText('Thigh Right'));
    expect(mockSelectSite).toHaveBeenLastCalledWith('thigh_R');
    fireEvent.press(screen.getByText('Continue'));
    expect(mockConfirmSite).toHaveBeenCalledTimes(1);
  },
);

it('suggests a site using the loaded history', async () => {
  mockGetDoseLogHistory.mockResolvedValueOnce([{
    injectionSite: 'abdomen_L',
    timestamp: new Date().toISOString(),
  }]);

  mount('injectionSiteSelection');
  expect(mockSelectSite).not.toHaveBeenCalled();

  await settle();
  expect(mockSelectSite).toHaveBeenCalledTimes(1);
  expect(mockSelectSite).toHaveBeenCalledWith('abdomen_R');
});

it('keeps a manual site picked while history is loading', async () => {
  mockGetDoseLogHistory.mockResolvedValueOnce([{
    injectionSite: 'abdomen_L',
    timestamp: new Date().toISOString(),
  }]);

  mount('injectionSiteSelection');
  fireEvent.press(screen.getByText('Thigh Right'));

  await settle();
  expect(mockSelectSite.mock.calls).toEqual([['thigh_R']]);
  fireEvent.press(screen.getByText('Continue'));
  expect(mockConfirmSite).toHaveBeenCalledTimes(1);
});


it('ignores a history response from a picker visit that has ended', async () => {
  let resolveOldHistory!: (history: Partial<DoseLog>[]) => void;
  mockGetDoseLogHistory
    .mockReturnValueOnce(new Promise(resolve => { resolveOldHistory = resolve; }))
    .mockResolvedValueOnce([]);

  mount('injectionSiteSelection');
  navigate('manualEntry');
  navigate('injectionSiteSelection');
  await settle();

  await act(async () => {
    resolveOldHistory([{ injectionSite: 'abdomen_L', timestamp: new Date().toISOString() }]);
  });

  expect(mockSelectSite.mock.calls).toEqual([['abdomen_L']]);
  expect(screen.queryByText('Today')).toBeNull();
});
