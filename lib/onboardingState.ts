import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from '@/types/userProfile';

export const ONBOARDING_COMPLETE_KEY = 'onboardingComplete';
export const USER_PROFILE_STORAGE_KEY = 'userProfile';
export const HOME_ROUTE = '/(tabs)/new-dose';
export const ONBOARDING_ROUTE = '/onboarding';
export const USER_TYPE_ROUTE = '/onboarding/userType';

export type LaunchUser = { uid: string; isAnonymous?: boolean } | null;

export type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export function routeFromLocalState(
  onboardingComplete: string | null,
  userProfile: string | null
): string {
  if (onboardingComplete !== 'true') return ONBOARDING_ROUTE;
  if (!userProfile) return USER_TYPE_ROUTE;
  return HOME_ROUTE;
}

export function isExistingProfile(data: unknown): data is UserProfile {
  if (!data || typeof data !== 'object') return false;
  const profile = data as Partial<UserProfile>;
  return Boolean(profile.dateCreated || typeof profile.isLicensedProfessional === 'boolean');
}

export async function persistCompletedOnboarding(
  profile: object,
  storage: StorageLike = AsyncStorage
): Promise<void> {
  await storage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  await storage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
}

export async function loadRemoteUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'userProfiles', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function resolveLaunchRoute(options: {
  user: LaunchUser;
  loadRemoteProfile?: (uid: string) => Promise<unknown | null>;
  storage?: StorageLike;
}): Promise<string> {
  const storage = options.storage ?? AsyncStorage;
  const user = options.user;

  if (user && !user.isAnonymous && options.loadRemoteProfile) {
    try {
      const remote = await options.loadRemoteProfile(user.uid);
      if (isExistingProfile(remote)) {
        await persistCompletedOnboarding(remote, storage);
        return HOME_ROUTE;
      }
    } catch (error) {
      console.warn('[onboardingState] Failed to load remote profile, falling back to local state', error);
    }
  }

  const [onboardingComplete, userProfile] = await Promise.all([
    storage.getItem(ONBOARDING_COMPLETE_KEY),
    storage.getItem(USER_PROFILE_STORAGE_KEY),
  ]);
  return routeFromLocalState(onboardingComplete, userProfile);
}

export async function routeAfterGoogleSignIn(options: {
  user: LaunchUser;
  fallbackRoute?: string;
  loadRemoteProfile?: (uid: string) => Promise<unknown | null>;
  storage?: StorageLike;
}): Promise<string> {
  if (!options.user) return options.fallbackRoute ?? ONBOARDING_ROUTE;
  const route = await resolveLaunchRoute({
    user: options.user,
    loadRemoteProfile: options.loadRemoteProfile,
    storage: options.storage,
  });
  if (route === HOME_ROUTE) return HOME_ROUTE;
  return options.fallbackRoute ?? route;
}
