import { act, renderHook } from '@testing-library/react-native';
import { getRedirectResult, onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { logAnalyticsEvent } from '../lib/analytics';
import * as googleAuth from '../lib/googleAuth';

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
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.useFakeTimers();
  jest.mocked(signOut).mockResolvedValue();
  jest.mocked(signInAnonymously).mockResolvedValue({ user: anonymous } as Awaited<ReturnType<typeof signInAnonymously>>);
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function mount(initialUser: User | null = anonymous) {
  jest.mocked(onAuthStateChanged).mockImplementationOnce((_auth, callback) => {
    notify = callback as typeof notify;
    notify(initialUser);
    return unsubscribe;
  });
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

it('keeps an empty session usable and retries after initial anonymous sign-in fails', async () => {
  jest.mocked(signInAnonymously).mockRejectedValueOnce(new Error('Guest sign-in failed'));
  const hook = await mount(null);

  expect(signInAnonymously).toHaveBeenCalledTimes(1);
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(hook.result.current.hasSignedOut).toBe(false);

  await act(async () => { notify(null); });
  expect(signInAnonymously).toHaveBeenCalledTimes(2);
  act(() => notify(anonymous));
  expect(hook.result.current.user).toBe(anonymous);
});

it('starts guest authentication when Firebase cannot restore a Google redirect', async () => {
  jest.mocked(getRedirectResult).mockRejectedValueOnce(new Error('Redirect result unavailable'));
  const hook = await mount(null);

  expect(getRedirectResult).toHaveBeenCalledTimes(1);
  expect(signInAnonymously).toHaveBeenCalledTimes(1);
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.hasSignedOut).toBe(false);
  act(() => notify(anonymous));
  expect(hook.result.current.user).toBe(anonymous);
});

it('subscribes to Firebase even if the Google redirect helper rejects', async () => {
  jest.spyOn(googleAuth, 'completeGoogleRedirect').mockRejectedValueOnce(new Error('Redirect helper failed'));

  const hook = await mount();

  expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  act(() => notify(signedIn));
  expect(hook.result.current.user).toBe(signedIn);
  expect(signInAnonymously).not.toHaveBeenCalled();
});

it.each([
  { path: 'delayed', receivesNull: true, delayMs: 500 },
  { path: 'fallback', receivesNull: false, delayMs: 10000 },
])('can retry after the $path anonymous sign-in rejects', async ({ receivesNull, delayMs }) => {
  const hook = await mount();
  act(() => notify(signedIn));
  jest.mocked(signInAnonymously).mockRejectedValueOnce(new Error('Guest sign-in failed'));

  await act(async () => { await hook.result.current.logout(); });
  if (receivesNull) act(() => notify(null));
  await act(async () => { jest.advanceTimersByTime(delayMs); });

  expect(signInAnonymously).toHaveBeenCalledTimes(1);
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.isSigningOut).toBe(false);
  expect(hook.result.current.hasSignedOut).toBe(true);

  await act(async () => { notify(null); });
  expect(signInAnonymously).toHaveBeenCalledTimes(2);
  act(() => notify(anonymous));
  expect(hook.result.current.user).toBe(anonymous);
  expect(hook.result.current.hasSignedOut).toBe(true);

  await act(async () => { jest.advanceTimersByTime(10000); });
  expect(signInAnonymously).toHaveBeenCalledTimes(2);
});

it('still clears preferences and completes logout when native usage cleanup rejects', async () => {
  const hook = await mount();
  const removeItem = jest.mocked(AsyncStorage.removeItem);
  removeItem.mockRejectedValueOnce(new Error('Usage storage unavailable'));

  await act(async () => { await hook.result.current.logout(); });

  expect(removeItem.mock.calls).toEqual([['usage'], ['preferences']]);
  expect(logAnalyticsEvent).toHaveBeenCalledWith('logout');
  expect(hook.result.current.user).toBeNull();
  expect(hook.result.current.hasSignedOut).toBe(true);
  act(() => notify(anonymous));
  expect(hook.result.current.isSigningOut).toBe(false);
});

it('completes logout when browser storage cannot be read', async () => {
  const hook = await mount();
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const readLocalStorage = jest.fn(() => { throw new Error('Browser storage unavailable'); });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: Object.defineProperty({}, 'localStorage', { get: readLocalStorage }),
  });

  try {
    await act(async () => { await hook.result.current.logout(); });

    expect(readLocalStorage).toHaveBeenCalledTimes(1);
    expect(logAnalyticsEvent).toHaveBeenCalledWith('logout');
    expect(hook.result.current.user).toBeNull();
    expect(hook.result.current.hasSignedOut).toBe(true);
    act(() => notify(anonymous));
    expect(hook.result.current.isSigningOut).toBe(false);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

it('unsubscribes and cancels both pending logout timers on unmount', async () => {
  const hook = await mount();
  await act(async () => { await hook.result.current.logout(); });
  act(() => notify(null));
  expect(hook.result.current.isSigningOut).toBe(true);

  hook.unmount();
  await act(async () => { jest.advanceTimersByTime(10000); });

  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(signInAnonymously).not.toHaveBeenCalled();
});
