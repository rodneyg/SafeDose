import { addDoc } from 'firebase/firestore';
import { renderHook } from '@testing-library/react-native';
import { useOnboardingIntentStorage } from './useOnboardingIntentStorage';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
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
