import Constants from "expo-constants";

// Analytics initialization state management
type AnalyticsState = 'uninitialized' | 'initializing' | 'initialized' | 'failed';

let analyticsState: AnalyticsState = 'uninitialized';
let analyticsInstance: any = null;
let eventQueue: Array<{ type: 'event'; eventName: string; parameters?: Record<string, any> }> = [];
let propertyQueue: Array<{ type: 'properties'; properties: Record<string, any> }> = [];

// Firebase Analytics module references (loaded dynamically)
let firebaseAnalytics: any = null;
let firebaseApp: any = null;

// Firebase configuration - isolated to prevent circular dependencies
const getFirebaseConfig = () => {
  const config = Constants.expoConfig?.extra?.firebase || {
    apiKey: "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
    authDomain: "safedose-e320d.firebaseapp.com",
    projectId: "safedose-e320d",
    storageBucket: "safedose-e320d.firebasestorage.app",
    messagingSenderId: "704055775889",
    appId: "1:704055775889:web:6ff0d3de5fea40b5b56530",
    measurementId: "G-WRY88Q57KK",
  };
  
  // Only include measurementId for web platforms where Analytics is available
  if (typeof window !== "undefined" && config.measurementId) {
    return {
      ...config,
      measurementId: String(config.measurementId)
    };
  } else {
    // For non-web platforms, exclude measurementId to avoid potential issues
    const { measurementId, ...configWithoutMeasurementId } = config;
    return configWithoutMeasurementId;
  }
};

// Core Analytics initialization function - completely isolated
const initializeAnalytics = async (): Promise<boolean> => {
  // Prevent multiple concurrent initialization attempts
  if (analyticsState === 'initializing') {
    console.log('[Analytics] Already initializing, waiting...');
    // Wait for current initialization to complete
    while (analyticsState === 'initializing') {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return analyticsState === 'initialized';
  }
  
  if (analyticsState === 'initialized') {
    console.log('[Analytics] Already initialized');
    return true;
  }
  
  // Only initialize in browser environments
  if (typeof window === "undefined") {
    console.log('[Analytics] Not in browser environment, skipping initialization');
    analyticsState = 'failed';
    return false;
  }
  
  analyticsState = 'initializing';
  console.log('[Analytics] Starting Firebase Analytics initialization...');
  
  try {
    // Get Firebase configuration
    const firebaseConfig = getFirebaseConfig();
    console.log('[Analytics] Configuration obtained:', { 
      hasMeasurementId: !!firebaseConfig.measurementId,
      measurementId: firebaseConfig.measurementId 
    });
    
    if (!firebaseConfig.measurementId) {
      console.log('[Analytics] No measurementId in config, Analytics not available');
      analyticsState = 'failed';
      return false;
    }
    
    // Validate measurementId format to prevent 'G' variable issues
    if (!firebaseConfig.measurementId.startsWith('G-') || firebaseConfig.measurementId.length < 10) {
      console.log('[Analytics] Invalid measurementId format, skipping to prevent initialization errors');
      analyticsState = 'failed';
      return false;
    }
    
    // Dynamic import of Firebase modules to prevent side effects
    console.log('[Analytics] Dynamically importing Firebase modules...');
    const [firebaseAppModule, firebaseAnalyticsModule] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics')
    ]);
    
    firebaseApp = firebaseAppModule;
    firebaseAnalytics = firebaseAnalyticsModule;
    
    console.log('[Analytics] Firebase modules loaded successfully');
    
    // Initialize Firebase App
    console.log('[Analytics] Initializing Firebase App...');
    const app = firebaseApp.initializeApp(firebaseConfig);
    console.log('[Analytics] Firebase App initialized:', { name: app.name });
    
    // Initialize Firebase Analytics
    console.log('[Analytics] Initializing Firebase Analytics...');
    analyticsInstance = firebaseAnalytics.getAnalytics(app);
    console.log('[Analytics] Firebase Analytics initialized successfully');
    
    analyticsState = 'initialized';
    
    // Process any queued events and properties
    await processQueuedOperations();
    
    return true;
    
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
    
    analyticsState = 'failed';
    analyticsInstance = null;
    firebaseAnalytics = null;
    firebaseApp = null;
    
    return false;
  }
};

// Process queued operations after successful initialization
const processQueuedOperations = async () => {
  if (analyticsState !== 'initialized' || !analyticsInstance || !firebaseAnalytics) {
    return;
  }
  
  console.log('[Analytics] Processing queued operations:', {
    events: eventQueue.length,
    properties: propertyQueue.length
  });
  
  // Process queued events
  eventQueue.forEach(({ eventName, parameters }) => {
    try {
      firebaseAnalytics.logEvent(analyticsInstance, eventName, parameters);
      console.log(`[Analytics] Queued event processed: ${eventName}`, parameters);
    } catch (error: any) {
      console.error(`[Analytics] Failed to process queued event ${eventName}:`, error);
    }
  });
  
  // Process queued properties
  propertyQueue.forEach(({ properties }) => {
    try {
      firebaseAnalytics.setUserProperties(analyticsInstance, properties);
      console.log(`[Analytics] Queued properties processed:`, properties);
    } catch (error: any) {
      console.error(`[Analytics] Failed to process queued properties:`, error);
    }
  });
  
  // Clear queues
  eventQueue = [];
  propertyQueue = [];
  console.log('[Analytics] All queued operations processed and queues cleared');
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
  
  if (analyticsState === 'initialized' && analyticsInstance && firebaseAnalytics) {
    // Analytics is ready, log immediately
    try {
      firebaseAnalytics.logEvent(analyticsInstance, eventName, parameters);
      console.log(`[Analytics] Event logged immediately: ${eventName}`, parameters);
    } catch (error: any) {
      console.error(`[Analytics] Failed to log event ${eventName}:`, error);
    }
  } else {
    // Queue the event and trigger initialization if needed
    console.log(`[Analytics] Queueing event: ${eventName}`, parameters);
    eventQueue.push({ type: 'event', eventName, parameters });
    
    // Trigger initialization if not already started
    if (analyticsState === 'uninitialized') {
      console.log('[Analytics] First analytics call detected, starting initialization');
      // Use setTimeout to avoid blocking the current call
      setTimeout(() => {
        initializeAnalytics().catch((error: any) => {
          console.error('[Analytics] Initialization failed:', error);
        });
      }, 0);
    }
  }
};

// Helper function to safely set user properties
export const setAnalyticsUserProperties = (properties: Record<string, any>) => {
  console.log('[Analytics] setAnalyticsUserProperties called:', { properties, timestamp: new Date().toISOString() });
  
  if (analyticsState === 'initialized' && analyticsInstance && firebaseAnalytics) {
    // Analytics is ready, set properties immediately
    try {
      firebaseAnalytics.setUserProperties(analyticsInstance, properties);
      console.log(`[Analytics] User properties set immediately:`, properties);
    } catch (error: any) {
      console.error(`[Analytics] Failed to set user properties:`, error);
    }
  } else {
    // Queue the properties and trigger initialization if needed
    console.log(`[Analytics] Queueing properties:`, properties);
    propertyQueue.push({ type: 'properties', properties });
    
    // Trigger initialization if not already started
    if (analyticsState === 'uninitialized') {
      console.log('[Analytics] First analytics call detected, starting initialization');
      // Use setTimeout to avoid blocking the current call
      setTimeout(() => {
        initializeAnalytics().catch((error: any) => {
          console.error('[Analytics] Initialization failed:', error);
        });
      }, 0);
    }
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