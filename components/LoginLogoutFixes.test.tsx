import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { logAnalyticsEvent } from '../lib/analytics';

jest.mock('firebase/auth', () => ({ getRedirectResult: jest.fn().mockResolvedValue(null), onAuthStateChanged: jest.fn(), signInAnonymously: jest.fn(), signOut: jest.fn() }));
jest.mock('../lib/firebase', () => { const auth = {}; return { auth, getAuthInstance: () => auth }; });
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(), setAnalyticsUserProperties: jest.fn(),
  ANALYTICS_EVENTS: { LOGOUT: 'logout' }, USER_PROPERTIES: { IS_ANONYMOUS: 'is_anonymous' },
}));

const anonymous = { uid: 'anonymous', isAnonymous: true } as User;
const signedIn = { uid: 'signed-in', isAnonymous: false, displayName: 'Test User', email: 'test@example.com' } as User;
let notify: (user: User | null) => void;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
    notify = callback as typeof notify;
    notify(anonymous);
    return unsubscribe;
  });
  jest.mocked(signOut).mockResolvedValue();
  jest.mocked(signInAnonymously).mockResolvedValue({ user: anonymous } as Awaited<ReturnType<typeof signInAnonymously>>);
});
afterEach(() => jest.useRealTimers());

async function mount() {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await act(async () => {});
  return hook;
}

it('subscribes once and exposes authenticated user updates from Firebase', async () => {
  const hook = await mount();
  expect(hook.result.current.user).toBe(anonymous);
  act(() => notify(signedIn));
  expect(hook.result.current.user).toBe(signedIn);
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  hook.unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

it.each([4, 10])('finishes logout after %s rapid null notifications with one delayed anonymous sign-in', async count => {
  const hook = await mount();
  act(() => notify(signedIn));
  await act(async () => { await hook.result.current.logout(); });
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.isSigningOut).toBe(true);
  act(() => { for (let i = 0; i < count; i++) notify(null); });
  expect(signInAnonymously).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(499));
  expect(hook.result.current.isSigningOut).toBe(true);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(logAnalyticsEvent).toHaveBeenCalledWith('logout');
  for (const key of ['usage', 'preferences']) {
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
  }
  expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('onboardingComplete');
  expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('userProfile');
  act(() => notify(anonymous));
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(hook.result.current.user).toBe(anonymous);
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
});

it('cancels logout recovery timers when a signed-in user arrives', async () => {
  const hook = await mount();
  await act(async () => { await hook.result.current.logout(); });
  act(() => notify(null));
  act(() => notify(signedIn));
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(hook.result.current.user).toBe(signedIn);
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(signInAnonymously).not.toHaveBeenCalled();
});

it('recovers through the fallback when Firebase never sends the null notification', async () => {
  const hook = await mount();
  await act(async () => { await hook.result.current.logout(); });
  act(() => jest.advanceTimersByTime(9999));
  expect(hook.result.current.isSigningOut).toBe(true);
  await act(async () => { jest.advanceTimersByTime(1); });
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
});

it('resets signing-out state and cancels fallback recovery if Firebase sign-out fails', async () => {
  const hook = await mount();
  jest.mocked(signOut).mockRejectedValueOnce(new Error('Sign out failed'));
  await act(async () => { await expect(hook.result.current.logout()).rejects.toThrow('Sign out failed'); });
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(hook.result.current.user).toBe(anonymous);
  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(signInAnonymously).not.toHaveBeenCalled();
  expect(logAnalyticsEvent).not.toHaveBeenCalled();
});
