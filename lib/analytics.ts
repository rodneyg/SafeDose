import { logEvent, setUserProperties } from 'firebase/analytics';
import { analytics } from './firebase';

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
  CANCEL_SUBSCRIPTION: 'cancel_subscription',
  DOWNGRADE_PLAN: 'downgrade_plan',
  SCAN_ATTEMPT: 'scan_attempt',
  SCAN_SUCCESS: 'scan_success',
  SCAN_FAILURE: 'scan_failure',
  REACH_SCAN_LIMIT: 'reach_scan_limit',
  LIMIT_MODAL_VIEW: 'limit_modal_view',
  LIMIT_MODAL_ACTION: 'limit_modal_action',
  ERROR_OCCURRED: 'error_occurred',
  // Onboarding events
  ONBOARDING_STEP_START: 'onboarding_step_start',
  ONBOARDING_STEP_COMPLETE: 'onboarding_step_complete',
  ONBOARDING_STEP_SKIP: 'onboarding_step_skip',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  FEEDBACK_SKIPPED: 'feedback_skipped',
  MANUAL_ENTRY_STARTED: 'manual_entry_started',
  MANUAL_ENTRY_COMPLETED: 'manual_entry_completed',
  // Revenue and retention events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  REVENUE_GENERATED: 'revenue_generated',
  APP_OPENED: 'app_opened',
  USER_RETAINED_DAY_1: 'user_retained_day_1',
  USER_RETAINED_DAY_7: 'user_retained_day_7',
  USER_RETAINED_DAY_30: 'user_retained_day_30',
} as const;

// User property names
export const USER_PROPERTIES = {
  PLAN_TYPE: 'plan_type',
  IS_ANONYMOUS: 'is_anonymous',
  SUBSCRIPTION_STATUS: 'subscription_status',
  RETENTION_COHORT: 'retention_cohort',
} as const;

// Helper function to safely log analytics events
export const logAnalyticsEvent = (eventName: string, parameters?: Record<string, any>) => {
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

// Simple revenue tracking
export const trackRevenue = (amount: number, currency: string = 'USD', planType?: string) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.REVENUE_GENERATED, {
    value: amount,
    currency,
    plan_type: planType,
  });
};

// Simple retention tracking
export const trackRetention = (days: 1 | 7 | 30) => {
  const eventMap = {
    1: ANALYTICS_EVENTS.USER_RETAINED_DAY_1,
    7: ANALYTICS_EVENTS.USER_RETAINED_DAY_7,
    30: ANALYTICS_EVENTS.USER_RETAINED_DAY_30,
  };
  
  logAnalyticsEvent(eventMap[days], {
    retention_day: days,
  });
};