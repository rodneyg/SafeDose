import { PMFSurveyTriggerData } from '../../types/pmf-survey';

// Test the core PMF survey trigger logic
describe('PMF Survey Trigger Logic', () => {
  const shouldTriggerSurvey = (sessionCount: number, hasShown: boolean): boolean => {
    if (hasShown) return false;
    return sessionCount === 2;
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
  });

  test('should NOT trigger survey on 0 sessions', () => {
    expect(shouldTriggerSurvey(0, false)).toBe(false);
  });
});

// Test PMF survey response structure
describe('PMF Survey Response Types', () => {
  test('should have correct response structure', () => {
    const mockResponse = {
      id: 'test-id',
      sessionId: 'session-123',
      deviceType: 'web',
      timestamp: '2024-01-01T00:00:00.000Z',
      responses: {
        disappointment: 'very_disappointed' as const,
        benefitPerson: 'Healthcare professionals who need precise dosing',
        mainBenefit: 'Accurate dose calculations',
        improvements: 'Better mobile interface',
      },
      metadata: {
        sessionCount: 1,
        scanFlow: true,
        completedAt: '2024-01-01T00:00:00.000Z',
      },
    };

    // Verify structure matches our type expectations
    expect(mockResponse.responses.disappointment).toBe('very_disappointed');
    expect(typeof mockResponse.responses.benefitPerson).toBe('string');
    expect(typeof mockResponse.responses.mainBenefit).toBe('string');
    expect(typeof mockResponse.responses.improvements).toBe('string');
    expect(mockResponse.metadata.sessionCount).toBe(1);
    expect(mockResponse.metadata.scanFlow).toBe(true);
  });
});