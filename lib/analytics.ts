/**
 * A completely safe, in-memory queue for analytics events.
 * THIS FILE MUST NOT IMPORT ANYTHING FROM FIREBASE.
 */

type QueuedOperation = {
  type: 'logEvent';
  payload: { eventName: string; eventParams?: { [key: string]: any } };
} | {
  type: 'setUserProperties';
  payload: { properties: { [key: string]: any } };
};

// This queue is globally accessible and safe.
export const analyticsQueue: QueuedOperation[] = [];
export let isAnalyticsInitialized = false;

// The functions the app will call. They just add to the queue.
export const logAnalyticsEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
  if (isAnalyticsInitialized) {
    console.warn(`[Analytics Queue] Analytics already initialized, but old log function called for ${eventName}. This is a bug.`);
    return;
  }
  console.log(`[Analytics Queue] Queuing event: ${eventName}`);
  analyticsQueue.push({ type: 'logEvent', payload: { eventName, eventParams } });
};

export const setAnalyticsUserProperties = (properties: { [key: string]: any }) => {
  if (isAnalyticsInitialized) {
    console.warn(`[Analytics Queue] Analytics already initialized, but old setUserProperties called. This is a bug.`);
    return;
  }
  console.log(`[Analytics Queue] Queuing user properties:`, properties);
  analyticsQueue.push({ type: 'setUserProperties', payload: { properties } });
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

/**
 * Signal that the Analytics provider has taken over.
 * Called by the AnalyticsProvider component.
 */
export const markAnalyticsInitialized = () => {
  isAnalyticsInitialized = true;
  console.log(`[Analytics Queue] Analytics provider has taken over. Queue contained ${analyticsQueue.length} operations.`);
};