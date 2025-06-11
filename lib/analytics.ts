import { getFirebaseApp } from './firebase';
import type { Analytics } from 'firebase/analytics';

// State management for the singleton
let analyticsInstance: Analytics | null = null;
let initializationPromise: Promise<Analytics | null> | null = null;

/**
 * Initializes and returns the Firebase Analytics instance.
 * This is the core function that isolates all side effects.
 * It's idempotent and safe to call multiple times.
 */
const getAnalyticsInstance = (): Promise<Analytics | null> => {
  // If initialization is already in progress, return the existing promise
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    // Return cached instance if already initialized
    if (analyticsInstance) {
      return analyticsInstance;
    }
    
    // Environment check: Do not run on server
    if (typeof window === 'undefined') {
      console.log('[Analytics] Environment is not a browser. Analytics disabled.');
      return null;
    }

    try {
      console.log('[Analytics] Starting dynamic import of Firebase Analytics modules...');
      
      // KEY FIX: Dynamically import ALL required functions ONLY when needed.
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      
      console.log('[Analytics] Modules imported. Checking for support...');

      if (!(await isSupported())) {
        console.warn('[Analytics] Firebase Analytics is not supported in this environment.');
        return null;
      }

      const app = getFirebaseApp();
      console.log('[Analytics] Firebase app obtained, initializing Analytics...');

      analyticsInstance = getAnalytics(app);
      console.log('[Analytics] Firebase Analytics initialized successfully');

      return analyticsInstance;
      
    } catch (error: any) {
      console.error('[Analytics] Failed to initialize Firebase Analytics:', error);
      console.error('[Analytics] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        timestamp: new Date().toISOString()
      });
      
      // Check if this is the specific 'G' variable error
      if (error?.message?.includes('G') || error?.message?.includes('before initialization')) {
        console.error('[Analytics] Detected G variable reference error - this is the known Firebase Analytics bug');
      }
      
      return null;
    }
  })();

  return initializationPromise;
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
export const logAnalyticsEvent = async (eventName: string, parameters?: Record<string, any>) => {
  console.log('[Analytics] logAnalyticsEvent called:', { eventName, parameters, timestamp: new Date().toISOString() });
  
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, eventName, parameters);
      console.log(`[Analytics] Event logged: ${eventName}`, parameters);
    } else {
      console.log(`[Analytics] Analytics not available, event not logged: ${eventName}`);
    }
  } catch (error: any) {
    console.error(`[Analytics] Failed to log event ${eventName}:`, error);
  }
};

// Helper function to safely set user properties
export const setAnalyticsUserProperties = async (properties: Record<string, any>) => {
  console.log('[Analytics] setAnalyticsUserProperties called:', { properties, timestamp: new Date().toISOString() });
  
  try {
    const analytics = await getAnalyticsInstance();
    if (analytics) {
      const { setUserProperties } = await import('firebase/analytics');
      setUserProperties(analytics, properties);
      console.log(`[Analytics] User properties set:`, properties);
    } else {
      console.log(`[Analytics] Analytics not available, properties not set`);
    }
  } catch (error: any) {
    console.error(`[Analytics] Failed to set user properties:`, error);
  }
};

// Helper function to set personalization user properties from profile
export const setPersonalizationUserProperties = async (profile: any) => {
  // Determine user segment based on profile
  let userSegment = 'general_user';
  if (profile.isLicensedProfessional) {
    userSegment = 'healthcare_professional';
  } else if (profile.isCosmeticUse) {
    userSegment = 'cosmetic_user';
  } else if (profile.isPersonalUse) {
    userSegment = 'personal_medical_user';
  }

  await setAnalyticsUserProperties({
    [USER_PROPERTIES.IS_LICENSED_PROFESSIONAL]: profile.isLicensedProfessional,
    [USER_PROPERTIES.IS_PERSONAL_USE]: profile.isPersonalUse,
    [USER_PROPERTIES.IS_COSMETIC_USE]: profile.isCosmeticUse,
    [USER_PROPERTIES.USER_SEGMENT]: userSegment,
  });
};