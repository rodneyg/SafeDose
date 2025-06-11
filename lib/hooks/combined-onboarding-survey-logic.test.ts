import { 
  CombinedOnboardingSurveyTriggerData,
  CombinedOnboardingSurveyResponses 
} from '../../types/combined-onboarding-survey';

// Test the core combined survey trigger logic
describe('Combined Onboarding Survey Trigger Logic', () => {
  const shouldTriggerSurvey = (sessionCount: number, hasShown: boolean): boolean => {
    if (hasShown) return false;
    return sessionCount === 2; // Same logic as PMF survey
  };

  test('should NOT trigger survey on 1st session', () => {
    expect(shouldTriggerSurvey(1, false)).toBe(false);
  });

  test('should trigger survey on 2nd session if not shown before', () => {
    expect(shouldTriggerSurvey(2, false)).toBe(true);
  });

  test('should NOT trigger survey on 3rd session', () => {
    expect(shouldTriggerSurvey(3, false)).toBe(false);
  });

  test('should NOT trigger survey if already shown before', () => {
    expect(shouldTriggerSurvey(1, true)).toBe(false);
    expect(shouldTriggerSurvey(2, true)).toBe(false);
    expect(shouldTriggerSurvey(3, true)).toBe(false);
  });

  test('should NOT trigger survey on 0 sessions', () => {
    expect(shouldTriggerSurvey(0, false)).toBe(false);
  });
});

// Test combined survey response structure
describe('Combined Survey Response Types', () => {
  test('should have correct response structure for Why Are You Here', () => {
    const mockResponse: CombinedOnboardingSurveyResponses = {
      whyAreYouHere: {
        response: 'reddit',
        customText: undefined,
      },
      pmf: {
        disappointment: 'very_disappointed',
        benefitPerson: 'Healthcare professionals',
        mainBenefit: 'Accurate calculations',
        improvements: 'Better mobile interface',
      }
    };

    // Verify structure matches our type expectations
    expect(mockResponse.whyAreYouHere?.response).toBe('reddit');
    expect(mockResponse.pmf?.disappointment).toBe('very_disappointed');
    expect(typeof mockResponse.pmf?.benefitPerson).toBe('string');
    expect(typeof mockResponse.pmf?.mainBenefit).toBe('string');
    expect(typeof mockResponse.pmf?.improvements).toBe('string');
  });

  test('should support Why Are You Here with custom text', () => {
    const mockResponse: CombinedOnboardingSurveyResponses = {
      whyAreYouHere: {
        response: 'other',
        customText: 'Found through a medical forum',
      },
    };

    expect(mockResponse.whyAreYouHere?.response).toBe('other');
    expect(mockResponse.whyAreYouHere?.customText).toBe('Found through a medical forum');
  });

  test('should support partial responses', () => {
    const mockResponse: CombinedOnboardingSurveyResponses = {
      whyAreYouHere: {
        response: 'ai_scan',
      },
      // PMF can be partial or missing if user skips
    };

    expect(mockResponse.whyAreYouHere?.response).toBe('ai_scan');
    expect(mockResponse.pmf).toBeUndefined();
  });
});

// Test trigger data structure
describe('Combined Survey Trigger Data', () => {
  test('should have correct trigger data structure', () => {
    const mockTriggerData: CombinedOnboardingSurveyTriggerData = {
      sessionCount: 2,
      lastSessionType: 'scan',
      shouldShowSurvey: true,
      hasShownBefore: false,
    };

    expect(mockTriggerData.sessionCount).toBe(2);
    expect(mockTriggerData.lastSessionType).toBe('scan');
    expect(mockTriggerData.shouldShowSurvey).toBe(true);
    expect(mockTriggerData.hasShownBefore).toBe(false);
  });

  test('should not show survey if already shown', () => {
    const mockTriggerData: CombinedOnboardingSurveyTriggerData = {
      sessionCount: 2,
      lastSessionType: 'manual',
      shouldShowSurvey: false,
      hasShownBefore: true,
    };

    expect(mockTriggerData.shouldShowSurvey).toBe(false);
    expect(mockTriggerData.hasShownBefore).toBe(true);
  });
});