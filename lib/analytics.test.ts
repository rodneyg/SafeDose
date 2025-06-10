import {
  logAnalyticsEventWithStorage,
  exportGroupedAnalytics,
  exportAnalyticsAsCSV,
  exportAnalyticsSummary,
  clearAnalyticsStore,
  USER_SEGMENTS,
  ANALYTICS_EVENTS
} from '../lib/analytics';

describe('Group Analyzer Export Functionality', () => {
  beforeEach(() => {
    clearAnalyticsStore();
  });

  describe('logAnalyticsEventWithStorage', () => {
    test('should store analytics events for export', () => {
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_ATTEMPT,
        { method: 'camera' },
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );

      const groupedData = exportGroupedAnalytics();
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events).toHaveLength(1);
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events[0].eventName).toBe(ANALYTICS_EVENTS.SCAN_ATTEMPT);
    });

    test('should handle events without user segment', () => {
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SIGN_IN_SUCCESS, { method: 'email' });

      const groupedData = exportGroupedAnalytics();
      expect(groupedData[USER_SEGMENTS.GENERAL_USER].events).toHaveLength(1);
    });
  });

  describe('exportGroupedAnalytics', () => {
    test('should group analytics by user segments', () => {
      // Add events for different user segments
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_ATTEMPT,
        { method: 'camera' },
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );
      
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.UPGRADE_SUCCESS,
        { plan: 'plus' },
        USER_SEGMENTS.COSMETIC_USER,
        'user_2'
      );

      const groupedData = exportGroupedAnalytics();

      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events).toHaveLength(1);
      expect(groupedData[USER_SEGMENTS.COSMETIC_USER].events).toHaveLength(1);
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].eventCounts[ANALYTICS_EVENTS.SCAN_ATTEMPT]).toBe(1);
      expect(groupedData[USER_SEGMENTS.COSMETIC_USER].eventCounts[ANALYTICS_EVENTS.UPGRADE_SUCCESS]).toBe(1);
    });

    test('should count unique users per segment', () => {
      // Add multiple events for same user
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_ATTEMPT,
        {},
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );
      
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_SUCCESS,
        {},
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );

      // Add event for different user
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_ATTEMPT,
        {},
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_2'
      );

      const groupedData = exportGroupedAnalytics();
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].userCount).toBe(2);
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events).toHaveLength(3);
    });

    test('should filter events by date range', () => {
      const pastDate = new Date('2023-01-01');
      const futureDate = new Date('2025-01-01');

      // This should be included
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SCAN_ATTEMPT, {}, USER_SEGMENTS.GENERAL_USER, 'user_1');

      const groupedData = exportGroupedAnalytics(pastDate, futureDate);
      expect(groupedData[USER_SEGMENTS.GENERAL_USER].events).toHaveLength(1);

      // Filter to exclude current events
      const veryFutureDate = new Date('2030-01-01');
      const filteredData = exportGroupedAnalytics(veryFutureDate);
      expect(filteredData[USER_SEGMENTS.GENERAL_USER].events).toHaveLength(0);
    });
  });

  describe('exportAnalyticsAsCSV', () => {
    test('should export analytics data as CSV format', () => {
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_ATTEMPT,
        {},
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );
      
      logAnalyticsEventWithStorage(
        ANALYTICS_EVENTS.SCAN_SUCCESS,
        {},
        USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
        'user_1'
      );

      const csvData = exportAnalyticsAsCSV();
      
      expect(csvData).toContain('User Segment,Event Name,Event Count,Total Events,Unique Users');
      expect(csvData).toContain(`${USER_SEGMENTS.HEALTHCARE_PROFESSIONAL},${ANALYTICS_EVENTS.SCAN_ATTEMPT},1,2,1`);
      expect(csvData).toContain(`${USER_SEGMENTS.HEALTHCARE_PROFESSIONAL},${ANALYTICS_EVENTS.SCAN_SUCCESS},1,2,1`);
    });

    test('should handle empty data', () => {
      const csvData = exportAnalyticsAsCSV();
      expect(csvData).toBe('User Segment,Event Name,Event Count,Total Events,Unique Users');
    });
  });

  describe('exportAnalyticsSummary', () => {
    test('should export analytics summary with top events', () => {
      // Add multiple events with different frequencies
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SCAN_ATTEMPT, {}, USER_SEGMENTS.HEALTHCARE_PROFESSIONAL, 'user_1');
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SCAN_ATTEMPT, {}, USER_SEGMENTS.HEALTHCARE_PROFESSIONAL, 'user_2');
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SCAN_SUCCESS, {}, USER_SEGMENTS.HEALTHCARE_PROFESSIONAL, 'user_1');

      const summary = exportAnalyticsSummary();

      expect(summary.totalSegments).toBe(4); // All user segments are included
      expect(summary.segmentSummary[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].totalEvents).toBe(3);
      expect(summary.segmentSummary[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].uniqueUsers).toBe(2);
      expect(summary.segmentSummary[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].topEvents[0].eventName).toBe(ANALYTICS_EVENTS.SCAN_ATTEMPT);
      expect(summary.segmentSummary[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].topEvents[0].count).toBe(2);
    });

    test('should include date range in summary', () => {
      const fromDate = new Date('2023-01-01');
      const toDate = new Date('2023-12-31');

      const summary = exportAnalyticsSummary(fromDate, toDate);

      expect(summary.dateRange.from).toBe(fromDate.toISOString());
      expect(summary.dateRange.to).toBe(toDate.toISOString());
    });
  });

  describe('clearAnalyticsStore', () => {
    test('should clear all stored analytics data', () => {
      logAnalyticsEventWithStorage(ANALYTICS_EVENTS.SCAN_ATTEMPT, {}, USER_SEGMENTS.HEALTHCARE_PROFESSIONAL, 'user_1');

      let groupedData = exportGroupedAnalytics();
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events).toHaveLength(1);

      clearAnalyticsStore();

      groupedData = exportGroupedAnalytics();
      expect(groupedData[USER_SEGMENTS.HEALTHCARE_PROFESSIONAL].events).toHaveLength(0);
    });
  });
});