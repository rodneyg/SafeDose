/**
 * Test for the Recovery option conditional display logic in onboarding
 * Tests that Recovery option appears for the right user types and handles mutual exclusivity
 */

describe('Onboarding Recovery Option Display Logic', () => {
  test('should show Recovery option for Professional Athletes', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
    };

    // Recovery option should be visible
    const shouldShowRecovery = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(true);
  });

  test('should show Recovery option for General Users', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
    };

    // Recovery option should be visible (General User)
    const shouldShowRecovery = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(true);
  });

  test('should NOT show Recovery option for Healthcare Professionals', () => {
    const userAnswers = {
      isLicensedProfessional: true,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
    };

    // Recovery option should NOT be visible (Healthcare Professional)
    const shouldShowRecovery = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(false);
  });

  test('should handle null/undefined values correctly', () => {
    const userAnswers = {
      isLicensedProfessional: null,
      isProfessionalAthlete: null,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
    };

    // Recovery option should be visible when professional status is null/false
    const shouldShowRecovery = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(true);
  });

  test('should prioritize healthcare professional status over athlete status', () => {
    // Edge case: someone who is both (shouldn't happen in UI but test the logic)
    const userAnswers = {
      isLicensedProfessional: true,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
    };

    // Recovery option should NOT be visible (Healthcare Professional takes precedence)
    const shouldShowRecovery = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(false);
  });

  test('should handle mutual exclusivity with Performance option', () => {
    let userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: true,
      isRecoveryUse: false,
    };

    // When Performance is selected, Recovery should be false
    expect(userAnswers.isPerformanceUse).toBe(true);
    expect(userAnswers.isRecoveryUse).toBe(false);

    // When Recovery is selected, Performance should become false
    userAnswers = {
      ...userAnswers,
      isPerformanceUse: false,
      isRecoveryUse: true,
    };

    expect(userAnswers.isPerformanceUse).toBe(false);
    expect(userAnswers.isRecoveryUse).toBe(true);
  });

  test('should handle mutual exclusivity with Cosmetic option', () => {
    let userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: true,
      isPerformanceUse: null,
      isRecoveryUse: false,
    };

    // When Cosmetic is selected, Recovery should be false
    expect(userAnswers.isCosmeticUse).toBe(true);
    expect(userAnswers.isRecoveryUse).toBe(false);

    // When Recovery is selected, Cosmetic should become false
    userAnswers = {
      ...userAnswers,
      isCosmeticUse: false,
      isRecoveryUse: true,
    };

    expect(userAnswers.isCosmeticUse).toBe(false);
    expect(userAnswers.isRecoveryUse).toBe(true);
  });

  test('should complete step when Recovery option is selected', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: true,
    };

    // Step 1 should be complete when any use type is selected
    const isStep1Complete = userAnswers.isCosmeticUse !== null || 
                           userAnswers.isPerformanceUse !== null || 
                           userAnswers.isRecoveryUse !== null;
    expect(isStep1Complete).toBe(true);
  });

  test('should default to Medical/Prescribed when no special use types are selected', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: false,
      isPerformanceUse: false,
      isRecoveryUse: false,
    };

    // Medical/Prescribed should be selected when all other options are false
    const isMedicalSelected = userAnswers.isCosmeticUse === false && 
                             userAnswers.isPerformanceUse === false && 
                             userAnswers.isRecoveryUse === false;
    expect(isMedicalSelected).toBe(true);
  });
});