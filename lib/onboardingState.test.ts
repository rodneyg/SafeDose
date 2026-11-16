jest.mock('./firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import {
  HOME_ROUTE,
  ONBOARDING_ROUTE,
  USER_TYPE_ROUTE,
  isExistingProfile,
  persistCompletedOnboarding,
  resolveLaunchRoute,
  routeAfterGoogleSignIn,
  routeFromLocalState,
} from './onboardingState';

function memoryStorage(initial: Record<string, string | null> = {}) {
  const data: Record<string, string | null> = { ...initial };
  return {
    getItem: jest.fn(async (key: string) => (key in data ? data[key] : null)),
    setItem: jest.fn(async (key: string, value: string) => {
      data[key] = value;
    }),
    data,
  };
}

const profile = {
  isLicensedProfessional: false,
  isPersonalUse: true,
  dateCreated: '2026-01-01T00:00:00.000Z',
  userId: 'user-1',
};

describe('onboardingState', () => {
  it('routes a fresh install to onboarding', () => {
    expect(routeFromLocalState(null, null)).toBe(ONBOARDING_ROUTE);
  });

  it('routes a completed tutorial without a profile to user type', () => {
    expect(routeFromLocalState('true', null)).toBe(USER_TYPE_ROUTE);
  });

  it('routes a completed local profile to home', () => {
    expect(routeFromLocalState('true', JSON.stringify(profile))).toBe(HOME_ROUTE);
  });

  it('recognizes a saved Firestore profile', () => {
    expect(isExistingProfile(profile)).toBe(true);
    expect(isExistingProfile({})).toBe(false);
    expect(isExistingProfile(null)).toBe(false);
  });

  it('sends a returning signed-in user with a remote profile straight home', async () => {
    const storage = memoryStorage();
    const route = await resolveLaunchRoute({
      user: { uid: 'user-1', isAnonymous: false },
      loadRemoteProfile: async () => profile,
      storage,
    });
    expect(route).toBe(HOME_ROUTE);
    expect(storage.data.onboardingComplete).toBe('true');
    expect(JSON.parse(storage.data.userProfile as string).userId).toBe('user-1');
  });

  it('does not skip onboarding for anonymous users or new Google accounts', async () => {
    const storage = memoryStorage();
    await expect(resolveLaunchRoute({
      user: { uid: 'anon', isAnonymous: true },
      loadRemoteProfile: async () => profile,
      storage,
    })).resolves.toBe(ONBOARDING_ROUTE);

    await expect(resolveLaunchRoute({
      user: { uid: 'new-google', isAnonymous: false },
      loadRemoteProfile: async () => null,
      storage,
    })).resolves.toBe(ONBOARDING_ROUTE);
  });

  it('falls back to local flags when the remote profile load fails', async () => {
    const storage = memoryStorage({
      onboardingComplete: 'true',
      userProfile: JSON.stringify(profile),
    });
    await expect(resolveLaunchRoute({
      user: { uid: 'user-1', isAnonymous: false },
      loadRemoteProfile: async () => {
        throw new Error('offline');
      },
      storage,
    })).resolves.toBe(HOME_ROUTE);
  });

  it('persists onboarding completion flags', async () => {
    const storage = memoryStorage();
    await persistCompletedOnboarding(profile, storage);
    expect(storage.data.onboardingComplete).toBe('true');
    expect(JSON.parse(storage.data.userProfile as string).dateCreated).toBe(profile.dateCreated);
  });
});

  it('routes a returning sign-in to home and a new account to the fallback', async () => {
    const storage = memoryStorage();
    await expect(routeAfterGoogleSignIn({
      user: { uid: 'user-1', isAnonymous: false },
      loadRemoteProfile: async () => profile,
      fallbackRoute: '/onboarding/age',
      storage,
    })).resolves.toBe(HOME_ROUTE);

    await expect(routeAfterGoogleSignIn({
      user: { uid: 'new-google', isAnonymous: false },
      loadRemoteProfile: async () => null,
      fallbackRoute: '/onboarding/age',
      storage: memoryStorage(),
    })).resolves.toBe('/onboarding/age');
  });
