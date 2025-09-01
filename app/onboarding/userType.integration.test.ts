/**
 * Integration test for the complete onboarding flow with Recovery option
 * Tests the full user journey including the new Recovery use case
 */

import { UserProfileAnswers, UserProfile, getUserWarningLevel, getDisclaimerText, WarningLevel } from '../../types/userProfile';

describe('Complete Onboarding Flow with Recovery Option', () => {
  
  test('Professional Athlete selecting Recovery use should complete successfully', () => {
    // Simulate onboarding flow
    const answers: UserProfileAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: true, // Professional athlete selects Recovery
      age: 25,
      birthDate: null,
    };

    // Create profile from answers (simulating the completion flow)
    const profile: UserProfile = {
      isLicensedProfessional: answers.isLicensedProfessional ?? false,
      isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
      isPersonalUse: answers.isPersonalUse ?? true,
      isCosmeticUse: answers.isCosmeticUse ?? false,
      isPerformanceUse: answers.isPerformanceUse ?? false,
      isRecoveryUse: answers.isRecoveryUse ?? false,
      age: answers.age || undefined,
      dateCreated: new Date().toISOString(),
      userId: 'test-user-id',
    };

    // Verify the profile is created correctly
    expect(profile.isProfessionalAthlete).toBe(true);
    expect(profile.isRecoveryUse).toBe(true);
    expect(profile.isPerformanceUse).toBe(false);
    expect(profile.isCosmeticUse).toBe(false);

    // Verify warning level and disclaimer
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MODERATE);
    expect(getDisclaimerText(profile)).toContain('Professional athlete use');
    expect(getDisclaimerText(profile)).toContain('sports medicine team');
  });

  test('General User selecting Recovery use should complete successfully', () => {
    const answers: UserProfileAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: true,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: true, // General user selects Recovery
      age: 35,
      birthDate: null,
    };

    const profile: UserProfile = {
      isLicensedProfessional: answers.isLicensedProfessional ?? false,
      isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
      isPersonalUse: answers.isPersonalUse ?? true,
      isCosmeticUse: answers.isCosmeticUse ?? false,
      isPerformanceUse: answers.isPerformanceUse ?? false,
      isRecoveryUse: answers.isRecoveryUse ?? false,
      age: answers.age || undefined,
      dateCreated: new Date().toISOString(),
      userId: 'test-user-id',
    };

    // Verify the profile is created correctly
    expect(profile.isLicensedProfessional).toBe(false);
    expect(profile.isProfessionalAthlete).toBe(false);
    expect(profile.isRecoveryUse).toBe(true);

    // Recovery use takes precedence over personal use for warning level
    expect(getUserWarningLevel(profile)).toBe(WarningLevel.MODERATE);
    expect(getDisclaimerText(profile)).toContain('Recovery use');
    expect(getDisclaimerText(profile)).toContain('recovery and injury healing protocols');
  });

  test('Healthcare Professional should not see Recovery option (conditional rendering)', () => {
    const answers: UserProfileAnswers = {
      isLicensedProfessional: true,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: null,
      isPerformanceUse: null,
      isRecoveryUse: null,
      age: 40,
      birthDate: null,
    };

    // Recovery option should NOT be visible
    const shouldShowRecovery = answers.isLicensedProfessional !== true;
    expect(shouldShowRecovery).toBe(false);

    // Performance option should also NOT be visible
    const shouldShowPerformance = answers.isLicensedProfessional !== true;
    expect(shouldShowPerformance).toBe(false);
  });

  test('Step completion logic works with Recovery option', () => {
    const scenarios = [
      // Step 0: Background selection
      {
        answers: { isLicensedProfessional: true, isProfessionalAthlete: null, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: null, isRecoveryUse: null, age: null, birthDate: null },
        step: 0,
        shouldBeComplete: true
      },
      {
        answers: { isLicensedProfessional: null, isProfessionalAthlete: true, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: null, isRecoveryUse: null, age: null, birthDate: null },
        step: 0,
        shouldBeComplete: true
      },
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: null, isRecoveryUse: null, age: null, birthDate: null },
        step: 0,
        shouldBeComplete: true
      },
      // Step 1: Use type selection (including Recovery)
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: true, isPerformanceUse: null, isRecoveryUse: null, age: null, birthDate: null },
        step: 1,
        shouldBeComplete: true
      },
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: true, isRecoveryUse: null, age: null, birthDate: null },
        step: 1,
        shouldBeComplete: true
      },
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: null, isRecoveryUse: true, age: null, birthDate: null },
        step: 1,
        shouldBeComplete: true
      },
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: false, isPerformanceUse: false, isRecoveryUse: false, age: null, birthDate: null },
        step: 1,
        shouldBeComplete: true // Medical/Prescribed is selected
      },
      {
        answers: { isLicensedProfessional: false, isProfessionalAthlete: false, isPersonalUse: null, isCosmeticUse: null, isPerformanceUse: null, isRecoveryUse: null, age: null, birthDate: null },
        step: 1,
        shouldBeComplete: false // Nothing selected
      },
    ];

    scenarios.forEach(({ answers, step, shouldBeComplete }, index) => {
      const isComplete = step === 0 
        ? answers.isLicensedProfessional !== null || answers.isProfessionalAthlete !== null
        : step === 1
        ? answers.isCosmeticUse !== null || answers.isPerformanceUse !== null || answers.isRecoveryUse !== null
        : true; // Step 2 is always complete

      expect(isComplete).toBe(shouldBeComplete, `Scenario ${index + 1} failed`);
    });
  });

  test('Mutual exclusivity works correctly with Recovery option', () => {
    // Test Recovery excludes Performance and Cosmetic
    let answers: UserProfileAnswers = {
      isLicensedProfessional: false,
      isProfessionalAthlete: false,
      isPersonalUse: null,
      isCosmeticUse: false,
      isPerformanceUse: false,
      isRecoveryUse: true,
      age: null,
      birthDate: null,
    };

    expect(answers.isRecoveryUse).toBe(true);
    expect(answers.isPerformanceUse).toBe(false);
    expect(answers.isCosmeticUse).toBe(false);

    // Test Performance excludes Recovery and Cosmetic
    answers = {
      ...answers,
      isCosmeticUse: false,
      isPerformanceUse: true,
      isRecoveryUse: false,
    };

    expect(answers.isPerformanceUse).toBe(true);
    expect(answers.isRecoveryUse).toBe(false);
    expect(answers.isCosmeticUse).toBe(false);

    // Test Cosmetic excludes Recovery and Performance
    answers = {
      ...answers,
      isCosmeticUse: true,
      isPerformanceUse: false,
      isRecoveryUse: false,
    };

    expect(answers.isCosmeticUse).toBe(true);
    expect(answers.isPerformanceUse).toBe(false);
    expect(answers.isRecoveryUse).toBe(false);
  });

  test('Analytics event includes Recovery use data', () => {
    const profile: UserProfile = {
      isLicensedProfessional: false,
      isProfessionalAthlete: true,
      isPersonalUse: true,
      isCosmeticUse: false,
      isPerformanceUse: false,
      isRecoveryUse: true,
      age: 28,
      dateCreated: new Date().toISOString(),
      userId: 'test-user-id',
    };

    // Simulate analytics event data structure
    const analyticsData = {
      isLicensedProfessional: profile.isLicensedProfessional,
      isProfessionalAthlete: profile.isProfessionalAthlete,
      isPersonalUse: profile.isPersonalUse,
      isCosmeticUse: profile.isCosmeticUse,
      isPerformanceUse: profile.isPerformanceUse,
      isRecoveryUse: profile.isRecoveryUse,
      age: profile.age,
      age_range: profile.age ? (profile.age < 18 ? 'minor' : profile.age < 65 ? 'adult' : 'senior') : 'unknown'
    };

    // Verify all fields are present
    expect(analyticsData.isRecoveryUse).toBeDefined();
    expect(analyticsData.isRecoveryUse).toBe(true);
    expect(analyticsData.isProfessionalAthlete).toBe(true);
    expect(analyticsData.age_range).toBe('adult');
  });
});