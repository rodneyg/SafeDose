import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Platform } from 'react-native';
import DatePickerSelect from './ui/DatePickerSelect';
import IntroScreen from './IntroScreen';
import Settings from '../app/(tabs)/settings';
import Welcome from '../app/onboarding/index';
import BirthDateCollection from '../app/onboarding/age';
import ChildSafety from '../app/onboarding/child-safety';
import CustomProgressBar from './CustomProgressBar';
import { getManualProgress } from '../lib/manualProgress';
import { hasScanCapacity } from '../lib/plans';
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'),
  ScrollView: 'ScrollView', Image: 'Image', useWindowDimensions: () => ({ width: 390 }),
}));
jest.mock('react-native-picker-select', () => 'NativePicker');
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('react-native-reanimated', () => {
  const animation = { delay: () => animation, duration: () => animation };
  return { __esModule: true, default: { View: 'AnimatedView' }, FadeIn: animation, FadeInDown: animation, FadeInUp: animation };
});
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null, auth: {} }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ disclaimerText: '', profile: null }) }));
jest.mock('../contexts/OnboardingContext', () => ({ useOnboardingDetails: () => ({ setDetails: jest.fn(), details: {} }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({ usageData: { scansUsed: 0, limit: 3, plan: 'free' } }) }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: () => ({ getDoseLogHistory: async () => [] }) }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null }));
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }), useFocusEffect: () => {} }));
const mockPopup = jest.fn();
jest.mock('firebase/auth', () => ({ signInWithPopup: (...args: unknown[]) => mockPopup(...args), GoogleAuthProvider: class { setCustomParameters() {} } }));

beforeEach(() => { jest.clearAllMocks(); mockPopup.mockReset(); Platform.OS = 'web'; (globalThis as any).__DEV__ = false; });

it.each([false, true])('year options are in an isolated modal at mobile=%s and selecting closes it', mobile => {
  require('../lib/utils').isMobileWeb = mobile;
  const onValueChange = jest.fn();
  let tree: ReactTestRenderer;
  act(() => { tree = create(<DatePickerSelect label="Year" value="" onValueChange={onValueChange} items={[{ label: '1990', value: '1990' }]} />); });
  act(() => tree!.root.findByProps({ accessibilityLabel: 'Year' }).props.onPress());
  const modal = tree!.root.findByType('Modal' as any);
  expect(modal.props.visible).toBe(true);
  act(() => modal.findByProps({ accessibilityLabel: '1990' }).props.onPress());
  expect(onValueChange).toHaveBeenCalledWith('1990');
  expect(tree!.root.findByType('Modal' as any).props.visible).toBe(false);
  act(() => tree!.unmount());
});

it.each([IntroScreen, Settings])('Google sign-in failure displays plain feedback and retry on %p', async Screen => {
  mockPopup.mockRejectedValueOnce({ code: 'auth/unauthorized-domain', message: 'private error details' }).mockResolvedValueOnce({ user: {} });
  let tree: ReactTestRenderer;
  await act(async () => { tree = create(<Screen setScreenStep={jest.fn()} resetFullForm={jest.fn()} /> as any); });
  const button = tree!.root.findAllByType('TouchableOpacity' as any).find(node => /Sign In with Google/.test(JSON.stringify(node.findAllByType('Text' as any).map(t => t.props.children))))!;
  await act(async () => { button.props.onPress(); });
  expect(tree!.root.findByProps({ accessibilityRole: 'alert' }).props.children).toBe('Could not sign in with Google. Please try again.');
  expect(JSON.stringify(tree!.toJSON())).not.toContain('unauthorized-domain');
  await act(async () => { tree!.root.findByProps({ accessibilityLabel: 'Retry Google sign in' }).props.onPress(); });
  expect(mockPopup).toHaveBeenCalledTimes(2);
  expect(tree!.root.findAllByProps({ accessibilityRole: 'alert' })).toHaveLength(0);
  act(() => tree!.unmount());
});

it.each(['concentration', 'totalAmount'])('progress counts each actual screen once on %s path', inputType => {
  const steps = ['dose', 'medicationSource', ...(inputType === 'totalAmount' ? ['totalAmountInput', 'reconstitution'] : ['concentrationInput']), 'syringe', 'preDoseConfirmation', 'finalResult'];
  steps.forEach((step, index) => {
    const props = getManualProgress(step, inputType);
    expect(props).toEqual({ currentStep: index + 1, totalSteps: steps.length });
    const tree = create(<CustomProgressBar {...props} />);
    expect(tree.root.findByType('Text' as any).props.children.join('')).toBe(`Step ${index + 1} of ${steps.length}`);
    tree.unmount();
  });
});

it.each([
  [Welcome, 'Start demo'], [BirthDateCollection, 'Skip birth date entry'], [ChildSafety, 'Continue to app'],
])('onboarding navigation does not generate a PUSH router key for %p', (Screen, label) => {
  const tree = create(<Screen />);
  const buttons = tree.root.findAllByType('TouchableOpacity' as any);
  const button = buttons.find(node => node.props.accessibilityLabel === label || node.findAllByType('Text' as any).some(t => t.props.children === label)) || buttons[0];
  act(() => button.props.onPress());
  // Age skip requires confirmation before navigation.
  if (Screen === BirthDateCollection) {
    act(() => tree.root.findByProps({ accessibilityLabel: 'Continue without providing birth date' }).props.onPress());
  }
  expect(mockNavigate).toHaveBeenCalled();
  tree.unmount();
});

it('manual-result teaser uses displayed capacity, without invoking authenticated capture or consuming a scan', () => {
  const source = readFileSync(join(__dirname, '../app/(tabs)/new-dose.tsx'), 'utf8');
  const handler = source.slice(source.indexOf('const handleTryAIScan'), source.indexOf('const toggleWebFlashlight'));
  expect(handler).toContain('hasScanCapacity(usageData.scansUsed, usageData.limit)');
  expect(handler).not.toContain('handleCapture');
  expect(handler).not.toContain('incrementScansUsed');
  expect(hasScanCapacity(0, 3)).toBe(true);
  expect(hasScanCapacity(3, 3)).toBe(false);
  expect(hasScanCapacity(3, -1)).toBe(true);
  expect(source).toContain("setScanError('Could not start the scan. Please try again in a moment.')");
});
