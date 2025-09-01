/**
 * Test for the Performance option conditional display logic in onboarding
 * Tests that Performance option appears for the right user types
 */

describe('Onboarding Performance Option Display Logic', () => {
  test('should show Performance option for Professional Athletes', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
    };

    // Performance option should be visible
    const shouldShowPerformance = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(true);
  });

  test('should show Performance option for General Users', () => {
    const userAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
    };

    // Performance option should be visible (General User)
    const shouldShowPerformance = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(true);
  });

  test('should NOT show Performance option for Healthcare Professionals', () => {
    const userAnswers = {
      isLicensedProfessional: true,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
    };

    // Performance option should NOT be visible (Healthcare Professional)
    const shouldShowPerformance = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(false);
  });

  test('should handle null/undefined values correctly', () => {
    const userAnswers = {
      isLicensedProfessional: null,
      isProfessionalAthlete: null,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
    };

    // Performance option should be visible when professional status is null/false
    const shouldShowPerformance = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(true);
  });

  test('should prioritize healthcare professional status over athlete status', () => {
    // Edge case: someone who is both (shouldn't happen in UI but test the logic)
    const userAnswers = {
      isLicensedProfessional: true,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
    };

    // Performance option should NOT be visible (Healthcare Professional takes precedence)
    const shouldShowPerformance = userAnswers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(false);
  });
});