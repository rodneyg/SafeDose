import { logEvent, setUserProperties } from 'firebase/analytics';
import { isPreviewEnvironment } from './environment';
import { getAnalyticsInstance } from './firebase';
import {
  logAnalyticsEvent,
  setAnalyticsUserProperties,
  setPersonalizationUserProperties,
} from './analytics';

jest.mock('firebase/analytics', () => ({
  logEvent: jest.fn(),
  setUserProperties: jest.fn(),
}));

jest.mock('./firebase', () => ({
  getAnalyticsInstance: jest.fn(),
}));

jest.mock('./environment', () => ({
  isPreviewEnvironment: jest.fn(),
}));

const mockLogEvent = logEvent as jest.MockedFunction<typeof logEvent>;
const mockSetUserProperties = setUserProperties as jest.MockedFunction<typeof setUserProperties>;
const mockGetAnalyticsInstance = getAnalyticsInstance as jest.MockedFunction<
  typeof getAnalyticsInstance
>;
const mockIsPreviewEnvironment = isPreviewEnvironment as jest.MockedFunction<
  typeof isPreviewEnvironment
>;
const analytics = {} as NonNullable<ReturnType<typeof getAnalyticsInstance>>;

describe('analytics helpers', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPreviewEnvironment.mockReturnValue(false);
    mockGetAnalyticsInstance.mockReturnValue(analytics);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('logAnalyticsEvent', () => {
    it('skips Firebase in preview environments', () => {
      mockIsPreviewEnvironment.mockReturnValue(true);

      logAnalyticsEvent('scan_success', { source: 'camera' });

      expect(mockGetAnalyticsInstance).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Preview environment - skipping event: scan_success',
        { source: 'camera' }
      );
    });

    it('logs an event with optional parameters when analytics is available', () => {
      const parameters = { source: 'camera' };

      logAnalyticsEvent('scan_success', parameters);

      expect(mockLogEvent).toHaveBeenCalledWith(analytics, 'scan_success', parameters);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Event logged: scan_success',
        parameters
      );
    });

    it('reports unavailable analytics without calling Firebase', () => {
      mockGetAnalyticsInstance.mockReturnValue(null);

      logAnalyticsEvent('scan_attempt');

      expect(mockLogEvent).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Analytics not available, would log: scan_attempt',
        undefined
      );
    });

    it('catches Firebase logging errors', () => {
      const error = new Error('logging failed');
      mockLogEvent.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => logAnalyticsEvent('scan_failure')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Analytics] Failed to log event scan_failure:',
        error
      );
    });
  });

  describe('setAnalyticsUserProperties', () => {
    const properties = { plan_type: 'pro' };

    it('skips Firebase in preview environments', () => {
      mockIsPreviewEnvironment.mockReturnValue(true);

      setAnalyticsUserProperties(properties);

      expect(mockGetAnalyticsInstance).not.toHaveBeenCalled();
      expect(mockSetUserProperties).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Preview environment - skipping user properties:',
        properties
      );
    });

    it('sets properties when analytics is available', () => {
      setAnalyticsUserProperties(properties);

      expect(mockSetUserProperties).toHaveBeenCalledWith(analytics, properties);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] User properties set:',
        properties
      );
    });

    it('reports unavailable analytics without calling Firebase', () => {
      mockGetAnalyticsInstance.mockReturnValue(null);

      setAnalyticsUserProperties(properties);

      expect(mockSetUserProperties).not.toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Analytics] Analytics not available, would set properties:',
        properties
      );
    });

    it('catches Firebase property errors', () => {
      const error = new Error('property update failed');
      mockSetUserProperties.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => setAnalyticsUserProperties(properties)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Analytics] Failed to set user properties:',
        error
      );
    });
  });

  describe('setPersonalizationUserProperties', () => {
    it.each([
      ['healthcare_professional', { isLicensedProfessional: true }],
      ['professional_athlete', { isProfessionalAthlete: true }],
      ['performance_user', { isPerformanceUse: true }],
      ['cosmetic_user', { isCosmeticUse: true }],
      ['personal_medical_user', { isPersonalUse: true }],
      ['general_user', {}],
    ])('sets the %s segment and profile flags', (expectedSegment, overrides) => {
      const profile = {
        isLicensedProfessional: false,
        isProfessionalAthlete: false,
        isPersonalUse: false,
        isCosmeticUse: false,
        isPerformanceUse: false,
        ...overrides,
      };

      setPersonalizationUserProperties(profile);

      expect(mockSetUserProperties).toHaveBeenCalledWith(analytics, {
        is_licensed_professional: profile.isLicensedProfessional,
        is_professional_athlete: profile.isProfessionalAthlete,
        is_personal_use: profile.isPersonalUse,
        is_cosmetic_use: profile.isCosmeticUse,
        is_performance_use: profile.isPerformanceUse,
        user_segment: expectedSegment,
      });
    });

    it('uses the first matching segment in priority order', () => {
      setPersonalizationUserProperties({
        isLicensedProfessional: false,
        isProfessionalAthlete: true,
        isPerformanceUse: true,
        isCosmeticUse: true,
        isPersonalUse: true,
      });

      expect(mockSetUserProperties).toHaveBeenCalledWith(
        analytics,
        expect.objectContaining({ user_segment: 'professional_athlete' })
      );
    });
  });
});
