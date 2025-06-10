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
  // Profile storage events  
  PROFILE_SAVED_FIREBASE: 'profile_saved_firebase',
  PROFILE_SAVED_LOCAL_ONLY: 'profile_saved_local_only',
  PROFILE_SAVE_FIREBASE_FAILED: 'profile_save_firebase_failed',
  PROFILE_BACKED_UP: 'profile_backed_up',
  PROFILE_BACKUP_FAILED: 'profile_backup_failed',
} as const;

// User property names
export const USER_PROPERTIES = {
  PLAN_TYPE: 'plan_type',
  IS_ANONYMOUS: 'is_anonymous',
  SUBSCRIPTION_STATUS: 'subscription_status',
  RETENTION_COHORT: 'retention_cohort',
  IS_LICENSED_PROFESSIONAL: 'is_licensed_professional',
  IS_PERSONAL_USE: 'is_personal_use',
  IS_COSMETIC_USE: 'is_cosmetic_use',
  USER_SEGMENT: 'user_segment', // Derived from profile settings
} as const;

// Platform detection
const isWeb = typeof window !== "undefined";
const isReactNative = !isWeb;

// Fallback analytics for React Native platforms
const logToNativeAnalytics = async (eventName: string, parameters?: Record<string, any>) => {
  try {
    // For React Native, we can use Expo's built-in analytics or implement native Firebase Analytics
    // For now, we'll use a more robust logging system that could be extended to real analytics
    
    // Enhanced logging with structured data for future analytics integration
    const analyticsData = {
      timestamp: new Date().toISOString(),
      platform: 'react-native',
      event: eventName,
      parameters: parameters || {},
    };
    
    console.log('[Analytics][ReactNative]', JSON.stringify(analyticsData));
    
    // Future enhancement: Send to native analytics service
    // - Firebase Analytics via React Native Firebase
    // - Expo Analytics (when available)
    // - Custom analytics endpoint
    
    // Store events locally for potential batch upload
    if (typeof global !== 'undefined' && global.localStorage) {
      try {
        const stored = global.localStorage.getItem('pending_analytics') || '[]';
        const events = JSON.parse(stored);
        events.push(analyticsData);
        
        // Keep only last 100 events to prevent storage bloat
        if (events.length > 100) {
          events.splice(0, events.length - 100);
        }
        
        global.localStorage.setItem('pending_analytics', JSON.stringify(events));
      } catch (storageError) {
        console.warn('[Analytics] Failed to store analytics event locally:', storageError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[Analytics] Failed to log React Native analytics event:', error);
    return false;
  }
};

// Enhanced cross-platform analytics function
export const logAnalyticsEvent = (eventName: string, parameters?: Record<string, any>) => {
  // Fire and forget approach - don't make callers wait for async operations
  const logAsync = async () => {
    try {
      if (isWeb && analytics) {
        // Web platform with Firebase Analytics
        logEvent(analytics, eventName, parameters);
        console.log(`[Analytics][Web] Event logged: ${eventName}`, parameters);
        return true;
      } else if (isReactNative) {
        // React Native platform - use enhanced native analytics
        return await logToNativeAnalytics(eventName, parameters);
      } else {
        // Fallback for unsupported environments
        console.log(`[Analytics][Fallback] Would log: ${eventName}`, parameters);
        return false;
      }
    } catch (error) {
      console.error(`[Analytics] Failed to log event ${eventName}:`, error);
      return false;
    }
  };
  
  // Execute async operation but don't wait for it
  logAsync().catch(error => {
    console.error(`[Analytics] Async logging failed for ${eventName}:`, error);
  });
};

// Helper function to safely set user properties
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  // Fire and forget approach
  const setAsync = async () => {
    try {
      if (isWeb && analytics) {
        setUserProperties(analytics, properties);
        console.log(`[Analytics][Web] User properties set:`, properties);
        return true;
      } else if (isReactNative) {
        // For React Native, store user properties locally for now
        const propertiesData = {
          timestamp: new Date().toISOString(),
          platform: 'react-native',
          userProperties: properties,
        };
        
        console.log('[Analytics][ReactNative] User properties set:', propertiesData);
        
        // Store user properties locally
        if (typeof global !== 'undefined' && global.localStorage) {
          try {
            global.localStorage.setItem('analytics_user_properties', JSON.stringify(propertiesData));
          } catch (storageError) {
            console.warn('[Analytics] Failed to store user properties locally:', storageError);
          }
        }
        
        return true;
      } else {
        console.log(`[Analytics][Fallback] Would set properties:`, properties);
        return false;
      }
    } catch (error) {
      console.error(`[Analytics] Failed to set user properties:`, error);
      return false;
    }
  };
  
  // Execute async operation but don't wait for it
  setAsync().catch(error => {
    console.error(`[Analytics] Async user properties setting failed:`, error);
  });
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

// Helper function to set personalization user properties from profile
export const setPersonalizationUserProperties = (profile: any) => {
  // Determine user segment based on profile
  let userSegment = 'general_user';
  if (profile.isLicensedProfessional) {
    userSegment = 'healthcare_professional';
  } else if (profile.isCosmeticUse) {
    userSegment = 'cosmetic_user';
  } else if (profile.isPersonalUse) {
    userSegment = 'personal_medical_user';
  }

  setAnalyticsUserProperties({
    [USER_PROPERTIES.IS_LICENSED_PROFESSIONAL]: profile.isLicensedProfessional,
    [USER_PROPERTIES.IS_PERSONAL_USE]: profile.isPersonalUse,
    [USER_PROPERTIES.IS_COSMETIC_USE]: profile.isCosmeticUse,
    [USER_PROPERTIES.USER_SEGMENT]: userSegment,
  });
};

// Utility function to get pending analytics events (for React Native)
export const getPendingAnalyticsEvents = () => {
  if (isReactNative && typeof global !== 'undefined' && global.localStorage) {
    try {
      const stored = global.localStorage.getItem('pending_analytics') || '[]';
      return JSON.parse(stored);
    } catch (error) {
      console.warn('[Analytics] Failed to retrieve pending analytics events:', error);
      return [];
    }
  }
  return [];
};

// Utility function to clear pending analytics events (after successful upload)
export const clearPendingAnalyticsEvents = () => {
  if (isReactNative && typeof global !== 'undefined' && global.localStorage) {
    try {
      global.localStorage.removeItem('pending_analytics');
      return true;
    } catch (error) {
      console.warn('[Analytics] Failed to clear pending analytics events:', error);
      return false;
    }
  }
  return false;
};