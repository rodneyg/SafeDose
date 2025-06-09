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
  // Revenue Analytics Events
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_REACTIVATED: 'subscription_reactivated',
  SUBSCRIPTION_UPGRADED: 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription_downgraded',
  REVENUE_GENERATED: 'revenue_generated',
  REFUND_PROCESSED: 'refund_processed',
  // User Engagement Events
  APP_OPENED: 'app_opened',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',
  FEATURE_USED: 'feature_used',
  SCREEN_VIEW: 'screen_view',
  USER_RETENTION_DAY_1: 'user_retention_day_1',
  USER_RETENTION_DAY_7: 'user_retention_day_7',
  USER_RETENTION_DAY_30: 'user_retention_day_30',
  // Conversion Funnel Events
  TRIAL_STARTED: 'trial_started',
  TRIAL_ENDED: 'trial_ended',
  TRIAL_CONVERTED: 'trial_converted',
  FREE_TO_PAID_CONVERSION: 'free_to_paid_conversion',
  CHURN_RISK_IDENTIFIED: 'churn_risk_identified',
  WIN_BACK_CAMPAIGN_SHOWN: 'win_back_campaign_shown',
} as const;

// User property names
export const USER_PROPERTIES = {
  PLAN_TYPE: 'plan_type',
  IS_ANONYMOUS: 'is_anonymous',
  SUBSCRIPTION_STATUS: 'subscription_status',
  CUSTOMER_LIFETIME_VALUE: 'customer_lifetime_value',
  DAYS_SINCE_SIGNUP: 'days_since_signup',
  TOTAL_SCANS_PERFORMED: 'total_scans_performed',
  LAST_ACTIVE_DATE: 'last_active_date',
  RETENTION_COHORT: 'retention_cohort',
  CHURN_RISK_SCORE: 'churn_risk_score',
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

// Revenue Analytics Helpers
export const trackRevenue = (amount: number, currency: string = 'USD', transactionId?: string, itemCategory?: string) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.REVENUE_GENERATED, {
    value: amount,
    currency,
    transaction_id: transactionId,
    item_category: itemCategory || 'subscription',
  });
};

export const trackSubscriptionEvent = (eventType: 'started' | 'renewed' | 'cancelled' | 'upgraded' | 'downgraded', planType: string, amount?: number) => {
  const eventMap = {
    started: ANALYTICS_EVENTS.SUBSCRIPTION_STARTED,
    renewed: ANALYTICS_EVENTS.SUBSCRIPTION_RENEWED,
    cancelled: ANALYTICS_EVENTS.SUBSCRIPTION_CANCELLED,
    upgraded: ANALYTICS_EVENTS.SUBSCRIPTION_UPGRADED,
    downgraded: ANALYTICS_EVENTS.SUBSCRIPTION_DOWNGRADED,
  };
  
  logAnalyticsEvent(eventMap[eventType], {
    plan_type: planType,
    value: amount,
    currency: 'USD',
  });
};

// User Engagement Helpers
export const trackSessionStart = () => {
  logAnalyticsEvent(ANALYTICS_EVENTS.SESSION_STARTED, {
    timestamp: new Date().toISOString(),
  });
};

export const trackSessionEnd = (duration: number) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.SESSION_ENDED, {
    session_duration: duration,
    timestamp: new Date().toISOString(),
  });
};

export const trackFeatureUsage = (featureName: string, context?: Record<string, any>) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.FEATURE_USED, {
    feature_name: featureName,
    ...context,
  });
};

export const trackScreenView = (screenName: string, previousScreen?: string) => {
  logAnalyticsEvent(ANALYTICS_EVENTS.SCREEN_VIEW, {
    screen_name: screenName,
    previous_screen: previousScreen,
  });
};

// Retention Helpers
export const trackRetentionMilestone = (days: 1 | 7 | 30) => {
  const eventMap = {
    1: ANALYTICS_EVENTS.USER_RETENTION_DAY_1,
    7: ANALYTICS_EVENTS.USER_RETENTION_DAY_7,
    30: ANALYTICS_EVENTS.USER_RETENTION_DAY_30,
  };
  
  logAnalyticsEvent(eventMap[days], {
    retention_day: days,
    timestamp: new Date().toISOString(),
  });
};

// Calculate and update user properties for analytics
export const updateUserAnalyticsProperties = (userData: {
  planType?: string;
  isAnonymous?: boolean;
  subscriptionStatus?: string;
  signupDate?: Date;
  totalScans?: number;
  lastActiveDate?: Date;
  lifetimeValue?: number;
}) => {
  const properties: Record<string, any> = {};
  
  if (userData.planType) properties[USER_PROPERTIES.PLAN_TYPE] = userData.planType;
  if (userData.isAnonymous !== undefined) properties[USER_PROPERTIES.IS_ANONYMOUS] = userData.isAnonymous;
  if (userData.subscriptionStatus) properties[USER_PROPERTIES.SUBSCRIPTION_STATUS] = userData.subscriptionStatus;
  if (userData.lifetimeValue) properties[USER_PROPERTIES.CUSTOMER_LIFETIME_VALUE] = userData.lifetimeValue;
  if (userData.totalScans) properties[USER_PROPERTIES.TOTAL_SCANS_PERFORMED] = userData.totalScans;
  if (userData.lastActiveDate) properties[USER_PROPERTIES.LAST_ACTIVE_DATE] = userData.lastActiveDate.toISOString();
  
  if (userData.signupDate) {
    const daysSinceSignup = Math.floor((new Date().getTime() - userData.signupDate.getTime()) / (1000 * 60 * 60 * 24));
    properties[USER_PROPERTIES.DAYS_SINCE_SIGNUP] = daysSinceSignup;
    
    // Set retention cohort based on signup date
    const signupMonth = userData.signupDate.toISOString().substring(0, 7); // YYYY-MM format
    properties[USER_PROPERTIES.RETENTION_COHORT] = signupMonth;
  }
  
  setAnalyticsUserProperties(properties);
};