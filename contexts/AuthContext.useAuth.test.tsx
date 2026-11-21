import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { onAuthStateChanged, signInAnonymously, signOut, User } from 'firebase/auth';
import { completeGoogleRedirect } from '@/lib/googleAuth';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInAnonymously: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/lib/firebase', () => ({ getAuthInstance: () => ({}) }));
jest.mock('@/lib/googleAuth', () => ({ completeGoogleRedirect: jest.fn() }));
jest.mock('@/lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  setAnalyticsUserProperties: jest.fn(),
  ANALYTICS_EVENTS: { LOGOUT: 'logout' },
  USER_PROPERTIES: { IS_ANONYMOUS: 'is_anonymous' },
}));

const signedInUser = { uid: 'signed-in', isAnonymous: false } as User;
const anonymousUser = { uid: 'anonymous', isAnonymous: true } as User;
let updateAuthState: (user: User | null) => void;

async function renderUseAuth() {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await act(async () => {});
  return hook;
}

describe('useAuth provider state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(completeGoogleRedirect).mockResolvedValue(null);
    jest.mocked(signInAnonymously).mockResolvedValue({ user: anonymousUser } as never);
    jest.mocked(signOut).mockResolvedValue();
    jest.mocked(onAuthStateChanged).mockImplementation((_auth, callback) => {
      updateAuthState = callback as typeof updateAuthState;
      return jest.fn();
    });
  });

  it('exposes a signed-in Firebase user', async () => {
    const hook = await renderUseAuth();

    act(() => updateAuthState(signedInUser));

    expect(hook.result.current.user).toBe(signedInUser);
    expect(hook.result.current.isSigningOut).toBe(false);
  });

  it('keeps the user signed out while starting an anonymous session', async () => {
    const hook = await renderUseAuth();

    act(() => updateAuthState(null));

    expect(hook.result.current.user).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('recovers an expired signed-in session through anonymous auth', async () => {
    const hook = await renderUseAuth();
    act(() => updateAuthState(signedInUser));

    act(() => updateAuthState(null));

    expect(hook.result.current.user).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
    act(() => updateAuthState(anonymousUser));
    expect(hook.result.current.user).toBe(anonymousUser);
  });

  it('continues listening when redirect completion fails', async () => {
    const redirectError = new Error('redirect failed');
    jest.mocked(completeGoogleRedirect).mockRejectedValueOnce(redirectError);
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    const hook = await renderUseAuth();
    act(() => updateAuthState(signedInUser));

    expect(warn).toHaveBeenCalledWith(
      '[AuthContext] Failed to complete Google redirect',
      redirectError
    );
    expect(hook.result.current.user).toBe(signedInUser);
    warn.mockRestore();
  });

  it('stays signed out and permits a retry when anonymous sign-in fails', async () => {
    const authError = new Error('anonymous sign-in failed');
    jest.mocked(signInAnonymously)
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce({ user: anonymousUser } as never);
    const error = jest.spyOn(console, 'error').mockImplementation();
    const hook = await renderUseAuth();

    await act(async () => {
      updateAuthState(null);
      await Promise.resolve();
    });
    await act(async () => {
      updateAuthState(null);
      await Promise.resolve();
    });

    expect(hook.result.current.user).toBeNull();
    expect(signInAnonymously).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      '[AuthContext] ❌ Error signing in anonymously:',
      authError
    );
    error.mockRestore();
  });

  it('resets signing-out state when Firebase sign-out fails', async () => {
    const signOutError = new Error('sign-out failed');
    jest.mocked(signOut).mockRejectedValueOnce(signOutError);
    const error = jest.spyOn(console, 'error').mockImplementation();
    const hook = await renderUseAuth();
    act(() => updateAuthState(signedInUser));

    await act(async () => {
      await expect(hook.result.current.logout()).rejects.toBe(signOutError);
    });

    expect(hook.result.current.user).toBe(signedInUser);
    expect(hook.result.current.isSigningOut).toBe(false);
    error.mockRestore();
  });
});
