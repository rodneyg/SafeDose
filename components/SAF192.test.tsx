import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import { signInWithPopup } from 'firebase/auth';
import FinalResultDisplay from './FinalResultDisplay';
import BirthDateCollection from '../app/onboarding/age';
import ChildSafety from '../app/onboarding/child-safety';
import Demo from '../app/onboarding/demo';
import { OnboardingProvider, useOnboardingDetails } from '../contexts/OnboardingContext';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ScrollView: 'ScrollView', Image: 'Image', useWindowDimensions: () => ({ width: 390 }), Alert: { alert: jest.fn() } }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native-reanimated', () => {
  const animation = { delay: () => animation, duration: () => animation };
  return { __esModule: true, default: { View: 'AnimatedView' }, FadeIn: animation, FadeInDown: animation, FadeInRight: animation, FadeInLeft: animation };
});
const mockRouter = { navigate: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@react-native-async-storage/async-storage', () => ({ setItem: jest.fn(async () => {}) }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('./ui/DatePickerSelect', () => 'DatePickerSelect');
jest.mock('./SyringeIllustration', () => 'SyringeIllustration');
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: 'Verify prescription' }) }));
let mockUser: any = null;
const mockLogDose = jest.fn(async () => ({ success: true }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser, auth: {} }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ logDose: mockLogDose, isLogging: false }) }));
jest.mock('firebase/auth', () => ({ signInWithPopup: jest.fn(), GoogleAuthProvider: class { setCustomParameters() {} } }));
let renderer: ReactTestRenderer;
const resultProps: React.ComponentProps<typeof FinalResultDisplay> = {
  calculationError: null, recommendedMarking: '10', doseValue: 1, unit: 'mg', substanceName: 'Test',
  manualSyringe: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' }, calculatedVolume: 0.1,
  handleStartOver: jest.fn(), setScreenStep: jest.fn(), handleGoToFeedback: jest.fn(), lastActionType: 'manual', isMobileWeb: false,
};
function saveButton() { return renderer.root.findByType('Save' as any).parent!; }
beforeEach(() => { jest.clearAllMocks(); mockUser = null; jest.spyOn(console, 'error').mockImplementation(() => {}); jest.spyOn(console, 'log').mockImplementation(() => {}); });
afterEach(() => { act(() => renderer?.unmount()); jest.restoreAllMocks(); });

it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/popup-blocked', 'auth/network-request-failed'])('resets Save after %s and allows retry', async code => {
  (signInWithPopup as jest.Mock).mockRejectedValue({ code });
  act(() => { renderer = create(<FinalResultDisplay {...resultProps} />); });
  await act(async () => { await saveButton().props.onPress(); });
  expect(saveButton().props.disabled).toBe(false);
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Signing in...');
  expect(mockLogDose).not.toHaveBeenCalled();
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') expect(Alert.alert).not.toHaveBeenCalled();
  await act(async () => { await saveButton().props.onPress(); });
  expect(signInWithPopup).toHaveBeenCalledTimes(2);
});

it('waits for popup success and auth state, saves once, then resets', async () => {
  let resolvePopup!: (value: any) => void;
  (signInWithPopup as jest.Mock).mockImplementation(() => new Promise(resolve => { resolvePopup = resolve; }));
  act(() => { renderer = create(<FinalResultDisplay {...resultProps} />); });
  let pending!: Promise<void>;
  act(() => { pending = saveButton().props.onPress(); });
  expect(saveButton().props.disabled).toBe(true);
  mockUser = { uid: 'test-user', isAnonymous: false };
  await act(async () => { renderer.update(<FinalResultDisplay {...resultProps} />); });
  expect(mockLogDose).not.toHaveBeenCalled();
  await act(async () => { resolvePopup({ user: mockUser }); await pending; });
  expect(mockLogDose).toHaveBeenCalledTimes(1);
  expect(saveButton().props.disabled).toBe(false);
});

it.each([['1990', '/onboarding/demo'], [String(new Date().getFullYear() - 15), '/onboarding/child-safety']])('keeps birth date and age out of the %s onboarding route', (year, route) => {
  let details: any;
  function Probe() { details = useOnboardingDetails().details; return null; }
  act(() => { renderer = create(<OnboardingProvider><Probe /><BirthDateCollection /></OnboardingProvider>); });
  for (const [label, value] of [['Year', year], ['Month', '01'], ['Day', '02']]) {
    act(() => renderer.root.findAllByType('DatePickerSelect' as any).find(p => p.props.label === label)!.props.onValueChange(value));
  }
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Continue with birth date' }).props.onPress());
  expect(mockRouter.navigate).toHaveBeenLastCalledWith(route);
  expect(details.birthDate).toBe(`${year}-01-02`);
  expect(typeof details.age).toBe('number');
});

it('child safety and demo forward no personal route parameters', async () => {
  act(() => { renderer = create(<OnboardingProvider><ChildSafety /></OnboardingProvider>); });
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Continue to app' }).props.onPress());
  expect(mockRouter.navigate).toHaveBeenLastCalledWith('/onboarding/demo');
  act(() => renderer.unmount());
  act(() => { renderer = create(<OnboardingProvider><Demo /></OnboardingProvider>); });
  for (let i = 0; i < 3; i++) {
    await act(async () => { await renderer.root.findAllByType('TouchableOpacity' as any)[0].props.onPress(); });
  }
  expect(mockRouter.replace).toHaveBeenLastCalledWith('/onboarding/userType');
});

it('does not save after cancellation even if auth changes later', async () => {
  (signInWithPopup as jest.Mock).mockRejectedValue({ code: 'auth/popup-closed-by-user' });
  act(() => { renderer = create(<FinalResultDisplay {...resultProps} />); });
  await act(async () => { await saveButton().props.onPress(); });
  mockUser = { uid: 'later-user', isAnonymous: false };
  await act(async () => { renderer.update(<FinalResultDisplay {...resultProps} />); });
  expect(mockLogDose).not.toHaveBeenCalled();
  expect(saveButton().props.disabled).toBe(false);
});

it('opens only one sign-in popup for two Save presses in the same render', async () => {
  let rejectPopup!: (error: unknown) => void;
  (signInWithPopup as jest.Mock).mockImplementation(() => new Promise((_, reject) => { rejectPopup = reject; }));
  act(() => { renderer = create(<FinalResultDisplay {...resultProps} />); });
  const onPress = saveButton().props.onPress;
  let pending!: Promise<void>;
  act(() => { pending = onPress(); void onPress(); });
  expect(signInWithPopup).toHaveBeenCalledTimes(1);
  await act(async () => { rejectPopup({ code: 'auth/popup-closed-by-user' }); await pending; });
  expect(saveButton().props.disabled).toBe(false);
});
