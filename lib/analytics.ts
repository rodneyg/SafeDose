import { logEvent, setUserProperties } from 'firebase/analytics';
import { analytics } from './firebase';
import { captureMessage, addBreadcrumb } from './sentry';

// Custom event names as defined in the issue
export const ANALYTICS_EVENTS = {
  SIGN_IN_ATTEMPT: 'sign_in_attempt',
  SIGN_IN_SUCCESS: 'sign_in_success',
  SIGN_IN_FAILURE: 'sign_in_failure',
  SIGN_UP_SUCCESS: 'sign_up_success',
  LOGOUT: 'logout',
  VIEW_PRICING_PAGE: 'view_pricing_page',
  INITIATE_UPGRADE: 'initiate_upgrade',
  UPGRADE_SUCCESS: 'upgrade_success',
  UPGRADE_FAILURE: 'upgrade_failure',
  SCAN_ATTEMPT: 'scan_attempt',
  SCAN_SUCCESS: 'scan_success',
  SCAN_FAILURE: 'scan_failure',
  REACH_SCAN_LIMIT: 'reach_scan_limit',
  LIMIT_MODAL_ACTION: 'limit_modal_action',
  ERROR_OCCURRED: 'error_occurred',
  // Onboarding events
  ONBOARDING_STEP_START: 'onboarding_step_start',
  ONBOARDING_STEP_COMPLETE: 'onboarding_step_complete',
  ONBOARDING_STEP_SKIP: 'onboarding_step_skip',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  // Manual entry and scan flow completion events for Sentry tracking
  MANUAL_ENTRY_COMPLETED: 'manual_entry_completed',
  SCAN_FLOW_COMPLETED: 'scan_flow_completed',
} as const;

// User property names
export const USER_PROPERTIES = {
  PLAN_TYPE: 'plan_type',
  IS_ANONYMOUS: 'is_anonymous',
} as const;

// Helper function to safely log analytics events
export const logAnalyticsEvent = (eventName: string, parameters?: Record<string, any>) => {
  // Log to Firebase Analytics
  if (analytics) {
    try {
      logEvent(analytics, eventName, parameters);
      console.log(`[Analytics] Event logged: ${eventName}`, parameters);
    } catch (error) {
      console.error(`[Analytics] Failed to log event ${eventName}:`, error);
    }
  } else {
    console.log(`[Analytics] Analytics not available, would log: ${eventName}`, parameters);
  }

  // Also send important events to Sentry for monitoring
  const sentryEvents = [
    ANALYTICS_EVENTS.MANUAL_ENTRY_COMPLETED,
    ANALYTICS_EVENTS.SCAN_FLOW_COMPLETED,
    ANALYTICS_EVENTS.UPGRADE_SUCCESS,
    ANALYTICS_EVENTS.REACH_SCAN_LIMIT,
    ANALYTICS_EVENTS.SCAN_FAILURE,
    ANALYTICS_EVENTS.UPGRADE_FAILURE,
    ANALYTICS_EVENTS.SIGN_IN_FAILURE,
    ANALYTICS_EVENTS.ERROR_OCCURRED,
  ];

  if (sentryEvents.includes(eventName as any)) {
    const level = eventName.includes('failure') || eventName.includes('error') ? 'error' : 'info';
    captureMessage(`Analytics Event: ${eventName}`, level, {
      event_name: eventName,
      event_parameters: parameters
    });
  }

  // Add breadcrumb for key user interactions
  const breadcrumbEvents = [
    ANALYTICS_EVENTS.SCAN_ATTEMPT,
    ANALYTICS_EVENTS.SCAN_SUCCESS,
    ANALYTICS_EVENTS.VIEW_PRICING_PAGE,
    ANALYTICS_EVENTS.INITIATE_UPGRADE,
    ANALYTICS_EVENTS.MANUAL_ENTRY_COMPLETED,
    ANALYTICS_EVENTS.SCAN_FLOW_COMPLETED,
  ];

  if (breadcrumbEvents.includes(eventName as any)) {
    addBreadcrumb({
      message: `User action: ${eventName}`,
      category: 'user_interaction',
      level: 'info',
      data: parameters
    });
  }
};

// Helper function to safely set user properties
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  if (analytics) {
    try {
      setUserProperties(analytics, properties);
      console.log(`[Analytics] User properties set:`, properties);
    } catch (error) {
      console.error(`[Analytics] Failed to set user properties:`, error);
    }
  } else {
    console.log(`[Analytics] Analytics not available, would set properties:`, properties);
  }
};