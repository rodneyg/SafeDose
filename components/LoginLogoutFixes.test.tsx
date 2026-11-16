import React from 'react';
import { render, act } from '@testing-library/react-native';
import { onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

jest.mock('firebase/auth', () => ({
  getRedirectResult: jest.fn().mockResolvedValue(null), onAuthStateChanged: jest.fn(), signOut: jest.fn(), signInAnonymously: jest.fn(),
}));
jest.mock('../lib/firebase', () => { const auth = {}; return { auth, getAuthInstance: () => auth }; });
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(), setAnalyticsUserProperties: jest.fn(),
  ANALYTICS_EVENTS: { LOGOUT: 'logout' }, USER_PROPERTIES: { IS_ANONYMOUS: 'is_anonymous' },
}));

let authStateCallback: (user: any) => void;
let state: ReturnType<typeof useAuth>;
function Probe() { state = useAuth(); return null; }

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
    authStateCallback = callback;
    return jest.fn();
  });
  (signOut as jest.Mock).mockResolvedValue(undefined);
  (signInAnonymously as jest.Mock).mockResolvedValue({ user: { uid: 'anon', isAnonymous: true } });
  render(<AuthProvider><Probe /></AuthProvider>);
  await act(async () => {}); // Finish redirect restoration before auth events.
});
afterEach(() => { jest.useRealTimers(); });

describe('Login and Logout Fixes Validation', () => {
  test('Fix 1: Login should trigger proper auth state updates', () => {
    act(() => authStateCallback({ uid: 'anon', isAnonymous: true }));
    expect(state.user?.isAnonymous).toBe(true);
    act(() => authStateCallback({ uid: 'google-user', displayName: 'Test User', isAnonymous: false }));
    expect(state.user?.uid).toBe('google-user');
    expect(state.user?.isAnonymous).toBe(false);
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  test('Fix 2: Logout should not get stuck with multiple auth state changes', async () => {
    act(() => authStateCallback({ uid: 'user', isAnonymous: false }));
    await act(async () => { await state.logout(); });
    expect(state.isSigningOut).toBe(true);
    act(() => { authStateCallback(null); authStateCallback(null); authStateCallback(null); });
    expect(signInAnonymously).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(state.isSigningOut).toBe(false);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  test('Fix 2b: Logout should work even with very rapid auth changes', async () => {
    act(() => authStateCallback({ uid: 'user', isAnonymous: false }));
    await act(async () => { await state.logout(); });
    act(() => { for (let i = 0; i < 10; i++) authStateCallback(null); });
    await act(async () => { jest.advanceTimersByTime(500); });
    expect(state.isSigningOut).toBe(false);
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    // A successful anonymous auth event cancels the remaining fallback timer.
    act(() => authStateCallback({ uid: 'anon', isAnonymous: true }));
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
