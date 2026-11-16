import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';

export function createGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

export function shouldFallbackToRedirect(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code || '';
  return [
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment',
  ].includes(code);
}

export async function completeGoogleRedirect(auth: Auth): Promise<UserCredential | null> {
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    return await getRedirectResult(auth);
  } catch (error) {
    console.warn('[googleAuth] getRedirectResult failed', error);
    return null;
  }
}

export async function signInWithGoogle(auth: Auth): Promise<UserCredential | null> {
  const provider = createGoogleProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    if (shouldFallbackToRedirect(error)) {
      console.log('[googleAuth] Popup unavailable, falling back to redirect', (error as { code?: string }).code);
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}
