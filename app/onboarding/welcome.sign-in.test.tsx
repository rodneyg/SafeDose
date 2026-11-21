import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import Welcome from './index';
import { signInWithGoogle } from '../../lib/googleAuth';

jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../../__mocks__/react-native'));
jest.mock('lucide-react-native', () => ({ ArrowRight: 'ArrowRight' }));
jest.mock('react-native-reanimated', () => {
  const animation = { delay: () => animation, duration: () => animation };
  return { __esModule: true, default: { View: 'AnimatedView' }, FadeIn: animation, FadeInDown: animation, FadeInUp: animation };
});
const mockRouter = { navigate: jest.fn(), replace: jest.fn() };
const mockAuth = {};
jest.mock('expo-router', () => ({ Link: 'Link', useRouter: () => mockRouter }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ auth: mockAuth, user: { uid: 'guest', isAnonymous: true } }) }));
jest.mock('../../lib/utils', () => ({ isMobileWeb: false }));
jest.mock('../../lib/googleAuth', () => ({ signInWithGoogle: jest.fn() }));
jest.mock('../../lib/firebase', () => ({ db: {}, getAnalyticsInstance: () => undefined }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn() }));

let tree: ReactTestRenderer;
const member = { uid: 'returning-member', isAnonymous: false };
const profile = { userId: member.uid, isLicensedProfessional: false, dateCreated: '2026-01-01' };
function signInButton() { return tree.root.findByProps({ accessibilityLabel: 'Sign in' }); }
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(null);
  jest.mocked(AsyncStorage.setItem).mockResolvedValue();
  jest.mocked(signInWithGoogle).mockResolvedValue({ user: member } as any);
  jest.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => profile } as any);
  act(() => { tree = create(<Welcome />); });
});
afterEach(() => { act(() => tree.unmount()); });

it('starts onboarding from the button used by the web preview smoke', () => {
  const button = tree.root.findByProps({ testID: 'onboarding-primary-cta' });
  act(() => button.props.onPress());
  expect(mockRouter.navigate).toHaveBeenCalledWith('/onboarding/age');
  expect(signInWithGoogle).not.toHaveBeenCalled();
});

it('lets a returning user sign in before the demo and lands on home using their remote profile', async () => {
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(signInWithGoogle).not.toHaveBeenCalled();
  await act(async () => { await signInButton().props.onPress(); });
  expect(signInWithGoogle).toHaveBeenCalledWith(mockAuth);
  expect(doc).toHaveBeenCalledWith(expect.anything(), 'userProfiles', member.uid);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('userProfile', JSON.stringify(profile));
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboardingComplete', 'true');
  expect(mockRouter.replace).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
  expect(mockRouter.navigate).not.toHaveBeenCalled();
});

it('keeps a new account on the onboarding path', async () => {
  jest.mocked(getDoc).mockResolvedValue({ exists: () => false } as any);
  await act(async () => { await signInButton().props.onPress(); });
  expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/age');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it('waits for authentication before loading a profile or navigating', async () => {
  let complete!: (result: any) => void;
  jest.mocked(signInWithGoogle).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = signInButton().props.onPress(); });
  expect(signInButton().props.disabled).toBe(true);
  expect(getDoc).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  await act(async () => { complete({ user: member }); await pending; });
  expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
  expect(signInButton().props.disabled).toBe(false);
});

it('shows a failed sign-in and allows retry without starting the demo', async () => {
  jest.mocked(signInWithGoogle).mockRejectedValueOnce(new Error('Sign-in unavailable. Please retry.'));
  await act(async () => { await signInButton().props.onPress(); });
  expect(JSON.stringify(tree.toJSON())).toContain('Sign-in unavailable. Please retry.');
  expect(signInButton().props.disabled).toBe(false);
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.navigate).not.toHaveBeenCalled();
  expect(getDoc).not.toHaveBeenCalled();
  await act(async () => { await signInButton().props.onPress(); });
  expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
});

it('does not navigate while Google redirect sign-in is in progress', async () => {
  jest.mocked(signInWithGoogle).mockResolvedValueOnce(undefined as any);
  await act(async () => { await signInButton().props.onPress(); });
  expect(getDoc).not.toHaveBeenCalled();
  expect(mockRouter.replace).not.toHaveBeenCalled();
  expect(mockRouter.navigate).not.toHaveBeenCalled();
});
