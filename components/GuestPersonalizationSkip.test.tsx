import React from 'react';
import { act, create } from 'react-test-renderer';
import UserType from '../app/onboarding/userType';
import { resolveLaunchRoute, HOME_ROUTE, USER_TYPE_ROUTE } from '../lib/onboardingState';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => ({ ...jest.requireActual('../__mocks__/react-native'), ScrollView: 'ScrollView' }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));
jest.mock('react-native-reanimated', () => {
  const animation = { delay: () => animation, duration: () => animation };
  return { __esModule: true, default: { View: 'AnimatedView' }, FadeIn: animation, FadeInDown: animation, FadeInRight: animation };
});
const mockReplace = jest.fn();
const mockSave = jest.fn();
const mockSubmit = jest.fn();
const mockSetItem = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../contexts/UserProfileContext', () => ({ useUserProfile: () => ({ saveProfile: mockSave }) }));
jest.mock('../contexts/OnboardingContext', () => ({ useOnboardingDetails: () => ({ details: { age: null, birthDate: null, limitedFunctionality: true } }) }));
jest.mock('../lib/hooks/useOnboardingIntentStorage', () => ({ useOnboardingIntentStorage: () => ({ submitOnboardingIntent: mockSubmit }) }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: async () => null, setItem: (...args: unknown[]) => mockSetItem(...args) }));
jest.mock('../lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));

beforeEach(() => jest.clearAllMocks());

it('opens protocol setup after completing personalization', async () => {
  const tree = create(<UserType />);
  const press = (label: string) => act(() => tree.root.findByProps({ accessibilityLabel: label }).props.onPress());
  try {
    press('General User');
    press('Continue to next step');
    press('Medical/Prescribed');
    press('Continue to next step');
    await act(async () => tree.root.findByProps({ accessibilityLabel: 'Complete setup' }).props.onPress());
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/onboarding/protocol-setup');
  } finally {
    act(() => tree.unmount());
  }
});
it.each([false, true])('skips unanswered personalization without submitting a profile, storage failure=%s', async fail => {
  if (fail) mockSetItem.mockRejectedValueOnce(new Error('Storage unavailable'));
  const tree = create(<UserType />);
  await act(async () => { await tree.root.findByProps({ accessibilityLabel: 'Skip personalization and enter dose manually' }).props.onPress(); });
  expect(mockReplace).toHaveBeenCalledWith('/(tabs)/new-dose?startManual=true');
  expect(mockSetItem).toHaveBeenCalledWith('personalizationSkipped', 'true');
  expect(mockSave).not.toHaveBeenCalled();
  expect(mockSubmit).not.toHaveBeenCalled();
  tree.unmount();
});
it.each([['true', HOME_ROUTE], [null, USER_TYPE_ROUTE]])('remembers an explicit skip=%s without fabricating a profile', async (skip, expected) => {
  const storage = { getItem: async (key: string) => key === 'onboardingComplete' ? 'true' : key === 'personalizationSkipped' ? skip : null, setItem: jest.fn() };
  expect(await resolveLaunchRoute({ user: null, storage })).toBe(expected);
  expect(storage.setItem).not.toHaveBeenCalled();
});
