import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import Constants from "expo-constants";

let getAnalytics: any = null;
let Analytics: any = null;

// Module initialization debug logging
console.log('[Firebase Module] Firebase module loading started');
console.log('[Firebase Module] Module load environment:', {
  hasWindow: typeof window !== "undefined",
  hasDocument: typeof document !== "undefined",
  hasNavigator: typeof navigator !== "undefined",
  hasConstants: !!Constants,
  timestamp: new Date().toISOString()
});

// Firebase configuration from app.config.js - lazily evaluated to avoid initialization issues
const getFirebaseConfig = () => {
  console.log('[Firebase Config] Starting configuration evaluation...');
  console.log('[Firebase Config] Environment check - window available:', typeof window !== "undefined");
  console.log('[Firebase Config] Constants.expoConfig available:', !!Constants.expoConfig);
  console.log('[Firebase Config] Constants.expoConfig.extra available:', !!Constants.expoConfig?.extra);
  console.log('[Firebase Config] Constants.expoConfig.extra.firebase available:', !!Constants.expoConfig?.extra?.firebase);
  
  const config = Constants.expoConfig?.extra?.firebase || {
    apiKey: "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
    authDomain: "safedose-e320d.firebaseapp.com",
    projectId: "safedose-e320d",
    storageBucket: "safedose-e320d.firebasestorage.app",
    messagingSenderId: "704055775889",
    appId: "1:704055775889:web:6ff0d3de5fea40b5b56530",
    measurementId: "G-WRY88Q57KK",
  };
  
  console.log('[Firebase Config] Raw config loaded:', {
    hasApiKey: !!config.apiKey,
    hasAuthDomain: !!config.authDomain,
    hasProjectId: !!config.projectId,
    hasAppId: !!config.appId,
    measurementId: config.measurementId,
    measurementIdType: typeof config.measurementId
  });
  
  // Only include measurementId for web platforms where Analytics is available
  if (typeof window !== "undefined" && config.measurementId) {
    console.log('[Firebase Config] Web platform detected, including measurementId');
    const finalConfig = {
      ...config,
      // Ensure measurementId is properly formatted as a string
      measurementId: String(config.measurementId)
    };
    console.log('[Firebase Config] Final config for web:', {
      ...finalConfig,
      apiKey: finalConfig.apiKey ? '[REDACTED]' : undefined
    });
    return finalConfig;
  } else {
    console.log('[Firebase Config] Non-web platform or no measurementId, excluding measurementId');
    console.log('[Firebase Config] Exclusion reason - window undefined:', typeof window === "undefined");
    console.log('[Firebase Config] Exclusion reason - no measurementId:', !config.measurementId);
    
    // For non-web platforms, exclude measurementId to avoid potential issues
    const { measurementId, ...configWithoutMeasurementId } = config;
    console.log('[Firebase Config] Final config (no measurementId):', {
      ...configWithoutMeasurementId,
      apiKey: configWithoutMeasurementId.apiKey ? '[REDACTED]' : undefined
    });
    return configWithoutMeasurementId;
  }
};

// Dynamically import Analytics module only when needed
const loadAnalyticsModule = async () => {
  if (!getAnalytics) {
    const analyticsModule = await import('firebase/analytics');
    getAnalytics = analyticsModule.getAnalytics;
    Analytics = analyticsModule.Analytics;
  }
};

// Lazy initialization - nothing is initialized at module load time
let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let analyticsInstance: Analytics | undefined = undefined;

const getFirebaseApp = (): FirebaseApp => {
  console.log('[Firebase App] getFirebaseApp called, current app state:', !!app);
  
  if (!app) {
    try {
      console.log('[Firebase App] Starting Firebase app initialization...');
      console.log('[Firebase App] Current environment:', {
        hasWindow: typeof window !== "undefined",
        hasNavigator: typeof navigator !== "undefined",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent?.substring(0, 100) : 'N/A'
      });
      
      const firebaseConfig = getFirebaseConfig();
      console.log('[Firebase App] Configuration obtained, initializing Firebase...');
      
      app = initializeApp(firebaseConfig);
      console.log('[Firebase App] Firebase app initialized successfully');
      console.log('[Firebase App] App details:', {
        name: app.name,
        hasOptions: !!app.options,
        optionsProjectId: app.options?.projectId
      });
    } catch (error) {
      console.error('[Firebase App] Failed to initialize Firebase app:', error);
      console.error('[Firebase App] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name
      });
      console.error('[Firebase App] Error occurred during app initialization phase');
      throw error;
    }
  } else {
    console.log('[Firebase App] Returning existing Firebase app instance');
  }
  
  return app;
};

export const getAuthInstance = (): Auth => {
  console.log('[Firebase Auth] getAuthInstance called, current auth state:', !!authInstance);
  
  if (!authInstance) {
    try {
      console.log('[Firebase Auth] Starting Firebase Auth initialization...');
      const appInstance = getFirebaseApp();
      console.log('[Firebase Auth] Firebase app obtained, initializing auth...');
      
      authInstance = getAuth(appInstance);
      console.log('[Firebase Auth] Firebase Auth initialized successfully');
      console.log('[Firebase Auth] Auth details:', {
        hasCurrentUser: !!authInstance.currentUser,
        hasConfig: !!authInstance.config
      });
    } catch (error) {
      console.error('[Firebase Auth] Failed to initialize Firebase Auth:', error);
      console.error('[Firebase Auth] Auth initialization error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error
      });
      throw error;
    }
  } else {
    console.log('[Firebase Auth] Returning existing Firebase Auth instance');
  }
  
  return authInstance;
};

export const getDbInstance = (): Firestore => {
  console.log('[Firebase Firestore] getDbInstance called, current db state:', !!dbInstance);
  
  if (!dbInstance) {
    try {
      console.log('[Firebase Firestore] Starting Firestore initialization...');
      const appInstance = getFirebaseApp();
      console.log('[Firebase Firestore] Firebase app obtained, initializing Firestore...');
      
      dbInstance = getFirestore(appInstance);
      console.log('[Firebase Firestore] Firestore initialized successfully');
      console.log('[Firebase Firestore] Firestore details:', {
        hasApp: !!dbInstance.app,
        appName: dbInstance.app?.name
      });
    } catch (error) {
      console.error('[Firebase Firestore] Failed to initialize Firestore:', error);
      console.error('[Firebase Firestore] Firestore initialization error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error
      });
      throw error;
    }
  } else {
    console.log('[Firebase Firestore] Returning existing Firestore instance');
  }
  
  return dbInstance;
};

export const getAnalyticsInstance = async (): Promise<Analytics | undefined> => {
  console.log('[Firebase] getAnalyticsInstance called at:', new Date().toISOString());
  
  // Only initialize Analytics in browser environments
  if (typeof window === "undefined") {
    console.log('[Firebase] Analytics not available - not in browser environment');
    console.log('[Firebase] Skipping Analytics initialization (server-side or non-browser)');
    return undefined;
  }
  
  console.log('[Firebase] getAnalyticsInstance called at:', new Date().toISOString());
  
  if (!analyticsInstance) {
    try {
      console.log('[Firebase] Starting Firebase Analytics initialization...');
      console.log('[Firebase] Browser environment confirmed, proceeding with initialization');
      
      // Get Firebase app instance first and ensure it's fully initialized
      console.log('[Firebase] Obtaining Firebase app instance...');
      const appInstance = getFirebaseApp();
      console.log('[Firebase] Firebase app instance retrieved:', !!appInstance);
      if (!appInstance) {
        console.error('[Firebase] Cannot initialize Analytics - Firebase app not available');
        console.error('[Firebase] App instance is null or undefined');
        return undefined;
      }
      console.log('[Firebase] Firebase app instance obtained successfully');
      
      // Verify the app configuration includes measurementId before proceeding
      console.log('[Firebase] Verifying measurementId in configuration...');
      const config = getFirebaseConfig();
      console.log('[Firebase] Firebase config retrieved:', { hasMeasurementId: !!config.measurementId });
      console.log('[Firebase] Configuration check:', {
        hasMeasurementId: !!config.measurementId,
        measurementId: config.measurementId,
        measurementIdType: typeof config.measurementId,
        measurementIdLength: config.measurementId?.length
      });
      
      if (!config.measurementId) {
        console.log('[Firebase] Analytics not initialized - no measurementId in config');
        console.log('[Firebase] This is expected for non-web platforms or when Analytics is disabled');
        return undefined;
      }
      
      // Additional defensive check - ensure measurementId follows expected format to prevent 'G' variable issues
      if (!config.measurementId.startsWith('G-') || config.measurementId.length < 10) {
        console.log('[Firebase] Analytics not initialized - invalid measurementId format');
        console.log('[Firebase] MeasurementId format validation failed, skipping to prevent initialization errors');
        return undefined;
      }
      
      // Load Analytics module dynamically
      await loadAnalyticsModule();
      console.log('[Firebase] Analytics module loaded');
      
      // Ensure the Firebase app is fully initialized before proceeding
      console.log('[Firebase] Firebase app ready, initializing Analytics...');
      console.log('[Firebase] About to call getAnalytics() with app instance');
      console.log('[Firebase] App instance details:', {
        appName: appInstance.name,
        hasOptions: !!appInstance.options,
        projectId: appInstance.options?.projectId
      });
      
      // Wrap the getAnalytics call in additional try-catch to catch 'G' variable reference errors
      try {
        console.log('[Firebase] Calling getAnalytics() with defensive error handling...');
        analyticsInstance = getAnalytics(appInstance);
        console.log('[Firebase] getAnalytics() call completed successfully');
      } catch (analyticsError) {
        console.error('[Firebase] getAnalytics() call failed - likely the G variable reference error:', analyticsError);
        console.error('[Firebase] This error is related to Firebase Analytics measurementId processing');
        
        // Check if this is the specific 'G' variable error
        if (analyticsError?.message?.includes('G') || analyticsError?.message?.includes('before initialization')) {
          console.error('[Firebase] Detected G variable reference error - Firebase Analytics incompatible with current environment');
          console.error('[Firebase] This is a known issue with Firebase Analytics initialization timing');
        }
        
        analyticsInstance = undefined;
        return undefined;
      }
      
      console.log('[Firebase] Firebase Analytics initialized successfully at:', new Date().toISOString());
      console.log('[Firebase] Analytics instance created:', {
        hasApp: !!analyticsInstance.app,
        appName: analyticsInstance.app?.name
      });
    } catch (error) {
      console.error('[Firebase] Analytics initialization failed:', error);
      console.error('[Firebase] Analytics error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        timestamp: new Date().toISOString()
      });
      
      // Log additional context that might help debug the 'G' variable issue
      console.error('[Firebase] Additional debug context:', {
        currentUrl: typeof window !== "undefined" ? window.location?.href : 'N/A',
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent?.substring(0, 100) : 'N/A',
        timestamp: new Date().toISOString()
      });
      
      // Ensure we don't leave analyticsInstance in a partial state
      console.log('[Firebase] Cleaning up failed Analytics instance...');
      analyticsInstance = undefined;
      return undefined;
    }
  } else {
    console.log('[Firebase] Returning existing Analytics instance');
  }
  
  console.log('[Firebase] Returning analytics instance:', !!analyticsInstance);
  return analyticsInstance;
};

// For backward compatibility, provide auth and db as getters
// These will initialize on first access rather than at module load time
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    console.log('[Firebase Proxy] Auth proxy accessed for property:', String(prop));
    const authInstance = getAuthInstance();
    console.log('[Firebase Proxy] Auth instance obtained, accessing property');
    return authInstance[prop as keyof Auth];
  }
});

export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    console.log('[Firebase Proxy] Firestore proxy accessed for property:', String(prop));
    const dbInstance = getDbInstance();
    console.log('[Firebase Proxy] Firestore instance obtained, accessing property');
    return dbInstance[prop as keyof Firestore];
  }
});

// Module loading completion
console.log('[Firebase Module] Firebase module loading completed successfully');
console.log('[Firebase Module] All exports and functions defined, ready for use');