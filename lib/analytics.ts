import { logEvent, setUserProperties } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';

// Analytics initialization state and queue management
let analyticsInitialized = false;
let initializationAttempted = false;
let eventQueue: Array<{ type: 'event'; eventName: string; parameters?: Record<string, any> }> = [];
let propertyQueue: Array<{ type: 'properties'; properties: Record<string, any> }> = [];

// Deferred Analytics initialization function
const initializeAnalyticsDeferred = () => {
  if (initializationAttempted) {
    return;
  }
  
  initializationAttempted = true;
  console.log('[Analytics] Starting deferred Analytics initialization...');
  
  // Add a small delay to ensure component tree is fully mounted
  setTimeout(async () => {
    try {
      console.log('[Analytics] Attempting to get Analytics instance after delay...');
      const analytics = await getAnalyticsInstance();
      
      if (analytics) {
        analyticsInitialized = true;
        console.log('[Analytics] Analytics successfully initialized, processing queued events');
        console.log('[Analytics] Processing', eventQueue.length, 'queued events and', propertyQueue.length, 'property updates');
        
        // Process queued events
        eventQueue.forEach(({ eventName, parameters }) => {
          try {
            logEvent(analytics, eventName, parameters);
            console.log(`[Analytics] Queued event processed: ${eventName}`, parameters);
          } catch (error) {
            console.error(`[Analytics] Failed to process queued event ${eventName}:`, error);
          }
        });
        
        // Process queued properties
        propertyQueue.forEach(({ properties }) => {
          try {
            setUserProperties(analytics, properties);
            console.log(`[Analytics] Queued properties processed:`, properties);
          } catch (error) {
            console.error(`[Analytics] Failed to process queued properties:`, error);
          }
        });
        
        // Clear queues
        eventQueue = [];
        propertyQueue = [];
        console.log('[Analytics] Event and property queues cleared');
      } else {
        console.log('[Analytics] Analytics not available after initialization attempt');
      }
    } catch (error) {
      console.error('[Analytics] Deferred Analytics initialization failed:', error);
      initializationAttempted = false; // Allow retry
    }
  }, 1000); // 1 second delay to ensure app is fully loaded
};

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
  // Profile storage events
  PROFILE_SAVED_FIREBASE: 'profile_saved_firebase',
  PROFILE_SAVED_LOCAL_ONLY: 'profile_saved_local_only',
  PROFILE_SAVE_FIREBASE_FAILED: 'profile_save_firebase_failed',
  PROFILE_BACKED_UP: 'profile_backed_up',
  PROFILE_BACKUP_FAILED: 'profile_backup_failed',
  // PMF Survey events
  PMF_SURVEY_SHOWN: 'pmf_survey_shown',
  PMF_SURVEY_QUESTION_ANSWERED: 'pmf_survey_question_answered',
  PMF_SURVEY_COMPLETED: 'pmf_survey_completed',
  PMF_SURVEY_SKIPPED: 'pmf_survey_skipped',
  PMF_SURVEY_DISMISSED: 'pmf_survey_dismissed',
  // Sign-up prompt events
  SIGNUP_PROMPT_SHOWN: 'signup_prompt_shown',
  SIGNUP_PROMPT_CLICKED: 'signup_prompt_clicked',
  SIGNUP_PROMPT_DISMISSED: 'signup_prompt_dismissed',
} as const;

// User property names
export const USER_PROPERTIES = {
  PLAN_TYPE: 'plan_type',
  IS_ANONYMOUS: 'is_anonymous',
  IS_LICENSED_PROFESSIONAL: 'is_licensed_professional',
  IS_PERSONAL_USE: 'is_personal_use',
  IS_COSMETIC_USE: 'is_cosmetic_use',
  USER_SEGMENT: 'user_segment', // Derived from profile settings
} as const;

// Helper function to safely log analytics events
export const logAnalyticsEvent = (eventName: string, parameters?: Record<string, any>) => {
  console.log('[Analytics] logAnalyticsEvent called:', { eventName, parameters, timestamp: new Date().toISOString() });
  
  // Trigger deferred initialization if not already attempted
  if (!initializationAttempted) {
    console.log('[Analytics] First analytics call detected, triggering deferred initialization');
    initializeAnalyticsDeferred();
  }
  
  if (analyticsInitialized) {
    // Analytics is ready, log immediately
    (async () => {
      try {
        const analytics = await getAnalyticsInstance();
        if (analytics) {
          logEvent(analytics, eventName, parameters);
          console.log(`[Analytics] Event logged: ${eventName}`, parameters);
        } else {
          console.log(`[Analytics] Analytics instance not available for event: ${eventName}`, parameters);
        }
      } catch (error) {
        console.error(`[Analytics] Failed to log event ${eventName}:`, error);
      }
    })();
  } else {
    // Queue the event for later processing
    console.log(`[Analytics] Queueing event: ${eventName}`, parameters);
    eventQueue.push({ type: 'event', eventName, parameters });
  }
};

// Helper function to safely set user properties
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  console.log('[Analytics] setAnalyticsUserProperties called:', { properties, timestamp: new Date().toISOString() });
  
  // Trigger deferred initialization if not already attempted
  if (!initializationAttempted) {
    console.log('[Analytics] First analytics call detected, triggering deferred initialization');
    initializeAnalyticsDeferred();
  }
  
  if (analyticsInitialized) {
    // Analytics is ready, set properties immediately
    (async () => {
      try {
        const analytics = await getAnalyticsInstance();
        if (analytics) {
          setUserProperties(analytics, properties);
          console.log(`[Analytics] User properties set immediately:`, properties);
        } else {
          console.log(`[Analytics] Analytics instance not available for properties:`, properties);
        }
      } catch (error) {
        console.error(`[Analytics] Failed to set user properties:`, error);
      }
    })();
  } else {
    // Queue the properties for later processing
    console.log(`[Analytics] Queueing properties:`, properties);
    propertyQueue.push({ type: 'properties', properties });
  }
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