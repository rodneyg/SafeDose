import React from 'react';
import { act, create } from 'react-test-renderer';
import { UserProfileProvider, useUserProfile } from './UserProfileContext';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc, setDoc } from 'firebase/firestore';

jest.mock('./AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db, _collection, uid) => ({ uid })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));
jest.mock('../lib/firestoreWithEnv', () => ({ setDocWithEnv: jest.fn() }));
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  setPersonalizationUserProperties: jest.fn(),
  ANALYTICS_EVENTS: {
    PROFILE_BACKED_UP: 'profile_backed_up',
    PROFILE_BACKUP_FAILED: 'profile_backup_failed',
    PROFILE_SAVED_FIREBASE: 'profile_saved_firebase',
    PROFILE_SAVE_FIREBASE_FAILED: 'profile_save_firebase_failed',
    PROFILE_SAVED_LOCAL_ONLY: 'profile_saved_local_only',
  },
}));

const profileA = {
  isLicensedProfessional: false,
  isProfessionalAthlete: false,
  isPersonalUse: true,
  isCosmeticUse: false,
  isPerformanceUse: false,
  isRecoveryUse: false,
  dateCreated: '2026-01-01T00:00:00.000Z',
  userId: 'account-a',
};
const profileB = { ...profileA, isPersonalUse: false, isCosmeticUse: true, userId: 'account-b' };

let observed: ReturnType<typeof useUserProfile> | undefined;
function Probe() {
  observed = useUserProfile();
  return null;
}
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const snapshot = (value?: typeof profileA) => ({ exists: () => Boolean(value), data: () => value });

describe('UserProfile account ownership', () => {
  let tree: ReturnType<typeof create> | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'account-a', isAnonymous: false } });
    (getDoc as jest.Mock).mockResolvedValue(snapshot(profileA));
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => tree?.unmount());
    tree = undefined;
    observed = undefined;
  });

  it('drops a deferred first-account read and loads the second account', async () => {
    const firstRead = deferred<ReturnType<typeof snapshot>>();
    (getDoc as jest.Mock).mockReturnValueOnce(firstRead.promise).mockResolvedValueOnce(snapshot(profileB));

    await act(async () => { tree = create(<UserProfileProvider><Probe /></UserProfileProvider>); });
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'account-b', isAnonymous: false } });
    await act(async () => { tree!.update(<UserProfileProvider><Probe /></UserProfileProvider>); });
    await act(async () => { firstRead.resolve(snapshot(profileA)); await firstRead.promise; });

    expect(observed?.profile).toEqual(profileB);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userProfile', JSON.stringify(profileB));
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userProfile');
  });

  it('does not back up another account cache when the new account has no cloud profile', async () => {
    const firstRead = deferred<ReturnType<typeof snapshot>>();
    (getDoc as jest.Mock).mockReturnValueOnce(firstRead.promise).mockResolvedValueOnce(snapshot());
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(profileA));

    await act(async () => { tree = create(<UserProfileProvider><Probe /></UserProfileProvider>); });
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'account-b', isAnonymous: false } });
    await act(async () => { tree!.update(<UserProfileProvider><Probe /></UserProfileProvider>); });
    await act(async () => { firstRead.resolve(snapshot(profileA)); await firstRead.promise; });

    expect(observed?.profile).toBeNull();
    expect(setDoc).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('userProfile');
  });

  it('preserves the anonymous profile when that same UID becomes authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'account-a', isAnonymous: true } });
    (getDoc as jest.Mock).mockResolvedValue(snapshot(profileA));
    await act(async () => { tree = create(<UserProfileProvider><Probe /></UserProfileProvider>); });
    expect(observed?.profile?.userId).toBe('account-a');

    (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'account-a', isAnonymous: false } });
    await act(async () => { tree!.update(<UserProfileProvider><Probe /></UserProfileProvider>); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(observed?.profile?.userId).toBe('account-a');
    expect(observed?.profile?.isPersonalUse).toBe(true);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith('userProfile');
    expect(setDoc).not.toHaveBeenCalled();
  });
});
