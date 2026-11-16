import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthInstance, getDbInstance } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { renderHook } from '@testing-library/react-native';
import { useOnboardingIntentStorage } from './useOnboardingIntentStorage';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  getAuthInstance: jest.fn(() => ({ currentUser: { uid: 'signed-in-user', isAnonymous: false } })),
  getDbInstance: jest.fn(() => ({ type: 'firestore' })),
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ path: 'onboarding_intent_submissions' })),
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
    jest.mocked(getAuthInstance).mockReturnValue({ currentUser: { uid: 'signed-in-user', isAnonymous: false } } as any);
  });

  it.each([null, { uid: 'anonymous-user', isAnonymous: true }])(
    'keeps guest intent locally without a remote write (%j)',
    async (currentUser) => {
      jest.mocked(getAuthInstance).mockReturnValue({ currentUser } as any);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useOnboardingIntentStorage());
      const answers = {
        isLicensedProfessional: false, isProfessionalAthlete: false,
        isPersonalUse: true, isCosmeticUse: false, isPerformanceUse: false,
      };
      const previous = Array.from({ length: 5 }, (_, index) => ({ device_id: `old-${index}` }));
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(previous));
      try {
        await expect(result.current.submitOnboardingIntent(answers)).resolves.toBeUndefined();
        expect(getDbInstance).not.toHaveBeenCalled();
        expect(collection).not.toHaveBeenCalled();
        expect(addDoc).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        const [key, value] = jest.mocked(AsyncStorage.setItem).mock.calls[0];
        expect(key).toBe('onboarding_intent_fallback');
        const saved = JSON.parse(value);
        expect(saved).toHaveLength(5);
        expect(saved[0].device_id).toBe('old-1');
        expect(saved[4]).toEqual(expect.objectContaining({
          ...answers, user_segment: 'personal_medical_user',
          timestamp: expect.any(String), device_id: expect.any(String),
        }));
      } finally {
        errorSpy.mockRestore();
      }
    }
  );

  it('uses the real Firestore instance for signed-in submissions', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    await result.current.submitOnboardingIntent({
      isLicensedProfessional: false, isProfessionalAthlete: false,
      isPersonalUse: true, isCosmeticUse: false, isPerformanceUse: false,
    });
    expect(collection).toHaveBeenCalledWith(getDbInstance(), 'onboarding_intent_submissions');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_intent_backup', expect.any(String));
  });

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
