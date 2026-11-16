import { completeGoogleRedirect, shouldFallbackToRedirect, signInWithGoogle } from './googleAuth';
import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth';

jest.mock('firebase/auth', () => {
  const actual = jest.requireActual('firebase/auth');
  return {
    ...actual,
    GoogleAuthProvider: class {
      setCustomParameters() {}
    },
    signInWithPopup: jest.fn(),
    signInWithRedirect: jest.fn(),
    getRedirectResult: jest.fn(),
  };
});

const mockSignInWithPopup = signInWithPopup as jest.Mock;
const mockSignInWithRedirect = signInWithRedirect as jest.Mock;
const mockGetRedirectResult = getRedirectResult as jest.Mock;

describe('googleAuth', () => {
  const auth = { authStateReady: jest.fn().mockResolvedValue(undefined) } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a popup credential when the popup succeeds', async () => {
    mockSignInWithPopup.mockResolvedValue({ user: { uid: 'abc', isAnonymous: false } });
    const result = await signInWithGoogle(auth);
    expect(result?.user.uid).toBe('abc');
    expect(mockSignInWithRedirect).not.toHaveBeenCalled();
  });

  it('falls back to redirect when the popup is blocked', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-blocked' });
    mockSignInWithRedirect.mockResolvedValue(undefined);
    await expect(signInWithGoogle(auth)).resolves.toBeNull();
    expect(mockSignInWithRedirect).toHaveBeenCalled();
  });

  it('does not swallow a real sign-in failure', async () => {
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/unauthorized-domain' });
    await expect(signInWithGoogle(auth)).rejects.toMatchObject({ code: 'auth/unauthorized-domain' });
  });

  it('waits for auth to be ready, then returns the redirect result', async () => {
    mockGetRedirectResult.mockResolvedValue({ user: { uid: 'from-redirect' } });
    const result = await completeGoogleRedirect(auth);
    expect(auth.authStateReady).toHaveBeenCalled();
    expect(result?.user.uid).toBe('from-redirect');
  });

  it('identifies popup failures that should use redirect', () => {
    expect(shouldFallbackToRedirect({ code: 'auth/popup-blocked' })).toBe(true);
    expect(shouldFallbackToRedirect({ code: 'auth/unauthorized-domain' })).toBe(false);
  });
});
