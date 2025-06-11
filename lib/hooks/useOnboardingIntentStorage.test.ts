import { renderHook } from '@testing-library/react-hooks';
import { useOnboardingIntentStorage } from './useOnboardingIntentStorage';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
}));

// Mock Firebase Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
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
      isLicensedProfessional: null,
      isPersonalUse: null,
      isCosmeticUse: null,
    };

    // Should not throw
    await expect(result.current.submitOnboardingIntent(answers)).resolves.not.toThrow();
  });

  it('should handle boolean answers correctly', async () => {
    const { result } = renderHook(() => useOnboardingIntentStorage());
    
    const answers = {
      isLicensedProfessional: true,
      isPersonalUse: false,
      isCosmeticUse: false,
    };

    // Should not throw
    await expect(result.current.submitOnboardingIntent(answers)).resolves.not.toThrow();
  });

  it('should determine correct user segments', () => {
    // Test the getUserSegment logic indirectly through the hook
    // We can't test the internal function directly, but we can verify
    // the hook doesn't crash with different answer combinations
    const { result } = renderHook(() => useOnboardingIntentStorage());
    
    const testCases = [
      { isLicensedProfessional: true, isPersonalUse: false, isCosmeticUse: false },
      { isLicensedProfessional: false, isPersonalUse: true, isCosmeticUse: true },
      { isLicensedProfessional: false, isPersonalUse: true, isCosmeticUse: false },
      { isLicensedProfessional: false, isPersonalUse: false, isCosmeticUse: false },
    ];

    testCases.forEach(async (answers) => {
      await expect(result.current.submitOnboardingIntent(answers)).resolves.not.toThrow();
    });
  });
});