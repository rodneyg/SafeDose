import { logEvent, setUserProperties } from 'firebase/analytics';
import { getAnalyticsInstance } from './firebase';
import { isPreviewEnvironment } from './environment';

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
  // Why Are You Here micro-prompt events
  WHY_HERE_PROMPT_SHOWN: 'why_here_prompt_shown',
  WHY_HERE_PROMPT_RESPONSE: 'why_here_prompt_response',
  WHY_HERE_PROMPT_SKIPPED: 'why_here_prompt_skipped',
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
  // Birth date collection and safety events
  BIRTH_DATE_COLLECTION_SHOWN: 'birth_date_collection_shown',
  BIRTH_DATE_COLLECTION_COMPLETED: 'birth_date_collection_completed',
  BIRTH_DATE_COLLECTION_SKIPPED: 'birth_date_collection_skipped',
  // Legacy age collection events (for backwards compatibility)
  AGE_COLLECTION_SHOWN: 'age_collection_shown',
  AGE_COLLECTION_COMPLETED: 'age_collection_completed',
  AGE_COLLECTION_SKIPPED: 'age_collection_skipped',
  CHILD_SAFETY_SCREEN_SHOWN: 'child_safety_screen_shown',
  CHILD_SAFETY_CONTINUE: 'child_safety_continue',
  CHILD_SAFETY_SEEK_HELP: 'child_safety_seek_help',
  // Before First Scan prompt events
  BEFORE_FIRST_SCAN_PROMPT_SHOWN: 'before_first_scan_prompt_shown',
  BEFORE_FIRST_SCAN_DONT_SHOW_AGAIN: 'before_first_scan_dont_show_again',
  BEFORE_FIRST_SCAN_CONTINUE: 'before_first_scan_continue',
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
  // Disable analytics in preview environment
  if (isPreviewEnvironment()) {
    console.log(`[Analytics] Preview environment - skipping event: ${eventName}`, parameters);
    return;
  }

  const analytics = getAnalyticsInstance();
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
  // Disable analytics in preview environment
  if (isPreviewEnvironment()) {
    console.log(`[Analytics] Preview environment - skipping user properties:`, properties);
    return;
  }

  const analytics = getAnalyticsInstance();
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