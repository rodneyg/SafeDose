import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import LoginScreen from '../app/login';
import { signInWithGoogle } from '../lib/googleAuth';

const mockRouter = { replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: { from?: string; session_id?: string } = { from: 'success', session_id: 'checkout_abc123' };
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));
jest.mock('react-native', () => jest.requireActual('../__mocks__/react-native'));
jest.mock('expo-router', () => ({ Link: 'Link', useLocalSearchParams: () => mockParams, useRouter: () => mockRouter }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { isAnonymous: true }, auth: {} }) }));
jest.mock('../lib/googleAuth', () => ({ signInWithGoogle: jest.fn() }));
jest.mock('../lib/onboardingState', () => ({ HOME_ROUTE: '/(tabs)/new-dose', loadRemoteUserProfile: jest.fn(), routeAfterGoogleSignIn: jest.fn() }));
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: { SIGN_IN_ATTEMPT: 'attempt', SIGN_UP_SUCCESS: 'signup', SIGN_IN_SUCCESS: 'success', SIGN_IN_FAILURE: 'failure' } }));

it('returns to the fixed success route with the original session after sign in', async () => {
  jest.mocked(signInWithGoogle).mockResolvedValueOnce({ user: { uid: 'member', isAnonymous: false } } as any);
  let renderer!: ReactTestRenderer;
  act(() => { renderer = create(<LoginScreen />); });
  const button = renderer.root.findByProps({ accessibilityLabel: 'Sign In with Google' });
  await act(async () => { await button.props.onPress(); });
  expect(mockRouter.replace).toHaveBeenCalledWith({
    pathname: '/success',
    params: { session_id: 'checkout_abc123' },
  });
  act(() => renderer.unmount());
});
