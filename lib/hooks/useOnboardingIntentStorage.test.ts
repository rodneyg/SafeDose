import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDbInstance } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { renderHook } from '@testing-library/react-native';
import { useOnboardingIntentStorage } from './useOnboardingIntentStorage';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: { proxy: true },
  getDbInstance: jest.fn(() => ({ realFirestore: true })),
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((instance) => {
    if (!instance.realFirestore) throw new Error('Expected a real Firestore instance');
    return { path: 'onboarding_intent_submissions' };
  }),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-doc-id' })),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe('useOnboardingIntentStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('should provide submitOnboardingIntent function', () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    
    expect(result.current.submitOnboardingIntent).toBeDefined();
    expect(typeof result.current.submitOnboardingIntent).toBe('function');
  });

  it('should handle null answers correctly', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    
    const answers = {
      isProfessionalAthlete: null,
      isPerformanceUse: null,
      isLicensedProfessional: null,
      isPersonalUse: null,
      isCosmeticUse: null,
    };

    // Should not throw
    await expect(result.current.submitOnboardingIntent(answers)).resolves.not.toThrow();
    expect(addDoc).toHaveBeenCalledWith({ path: 'onboarding_intent_submissions' }, expect.objectContaining({
      isLicensedProfessional: false, isPersonalUse: true, user_segment: 'personal_medical_user',
    }));
  });

  it('should handle boolean answers correctly', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    
    const answers = {
      isProfessionalAthlete: false,
      isPerformanceUse: false,
      isLicensedProfessional: true,
      isPersonalUse: false,
      isCosmeticUse: false,
    };

    // Should not throw
    await expect(result.current.submitOnboardingIntent(answers)).resolves.not.toThrow();
    expect(addDoc).toHaveBeenCalledWith({ path: 'onboarding_intent_submissions' }, expect.objectContaining({
      isLicensedProfessional: true, isPersonalUse: false, user_segment: 'healthcare_professional',
    }));
  });

  it('should determine correct user segments', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    const testCases = [
      [true, false, false, 'healthcare_professional'],
      [false, true, true, 'cosmetic_user'],
      [false, true, false, 'personal_medical_user'],
      [false, false, false, 'general_user'],
    ] as const;
    for (const [isLicensedProfessional, isPersonalUse, isCosmeticUse, segment] of testCases) {
      await result.current.submitOnboardingIntent({
        isLicensedProfessional, isPersonalUse, isCosmeticUse,
        isProfessionalAthlete: false, isPerformanceUse: false,
      });
      expect(addDoc).toHaveBeenLastCalledWith({ path: 'onboarding_intent_submissions' }, expect.objectContaining({ user_segment: segment }));
    }
  });
});


describe('guest intent persistence outcomes', () => {
  const answers = {
    isProfessionalAthlete: false, isPerformanceUse: false,
    isLicensedProfessional: false, isPersonalUse: true, isCosmeticUse: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('passes the actual initialized instance and confirms cloud persistence', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await expect(result.current.submitOnboardingIntent(answers)).resolves.toBe('cloud');
    expect(collection).toHaveBeenCalledWith(
      (getDbInstance as jest.Mock).mock.results[0].value, 'onboarding_intent_submissions',
    );
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_intent_backup', expect.any(String));
  });

  it('uses bounded local fallback when Firestore initialization fails', async () => {
    (getDbInstance as jest.Mock).mockImplementationOnce(() => { throw new Error('unavailable'); });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(Array(5).fill({ old: true })));
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await expect(result.current.submitOnboardingIntent(answers)).resolves.toBe('local');
    expect(addDoc).not.toHaveBeenCalled();
    const [key, json] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
    expect(key).toBe('onboarding_intent_fallback');
    expect(JSON.parse(json)).toHaveLength(5);
    expect(JSON.parse(json)[4]).toMatchObject({ user_segment: 'personal_medical_user' });
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('saved to Firestore'), expect.anything());
  });

  it('reports local only when the cloud write is rejected', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('permission-denied'));
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await expect(result.current.submitOnboardingIntent(answers)).resolves.toBe('local');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_intent_fallback', expect.any(String));
  });

  it('keeps cloud success when only the local backup fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await expect(result.current.submitOnboardingIntent(answers)).resolves.toBe('cloud');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('reports complete failure without interrupting onboarding', async () => {
    (addDoc as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await expect(result.current.submitOnboardingIntent(answers)).resolves.toBe('failed');
  });
});


it('guards against the legacy proxy with the real Firebase SDK, without network access', () => {
  const { initializeApp } = jest.requireActual('firebase/app');
  const { getFirestore, collection: realCollection } = jest.requireActual('firebase/firestore');
  const instance = getFirestore(initializeApp({ projectId: 'saf315-offline-test' }, 'saf315-regression'));
  const legacyProxy = new Proxy({}, { get: (_, prop) => instance[prop] });
  expect(() => realCollection(legacyProxy, 'onboarding_intent_submissions')).toThrow();
  expect(realCollection(instance, 'onboarding_intent_submissions').path).toBe('onboarding_intent_submissions');
});
