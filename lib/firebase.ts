import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import Constants from "expo-constants";

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

export const getAnalyticsInstance = (): Analytics | undefined => {
  console.log('[Firebase Analytics] getAnalyticsInstance called');
  console.log('[Firebase Analytics] Current analytics state:', !!analyticsInstance);
  console.log('[Firebase Analytics] Environment check details:', {
    windowUndefined: typeof window === "undefined",
    hasWindow: typeof window !== "undefined",
    hasDocument: typeof document !== "undefined",
    hasNavigator: typeof navigator !== "undefined"
  });
  
  // Only initialize Analytics in browser environments
  if (typeof window === "undefined") {
    console.log('[Firebase Analytics] Analytics not available - not in browser environment');
    console.log('[Firebase Analytics] Skipping Analytics initialization (server-side or non-browser)');
    return undefined;
  }
  
  if (!analyticsInstance) {
    try {
      console.log('[Firebase Analytics] Starting Firebase Analytics initialization...');
      console.log('[Firebase Analytics] Browser environment confirmed, proceeding with initialization');
      
      // Get Firebase app instance first and ensure it's fully initialized
      console.log('[Firebase Analytics] Obtaining Firebase app instance...');
      const appInstance = getFirebaseApp();
      if (!appInstance) {
        console.error('[Firebase Analytics] Cannot initialize Analytics - Firebase app not available');
        console.error('[Firebase Analytics] App instance is null or undefined');
        return undefined;
      }
      console.log('[Firebase Analytics] Firebase app instance obtained successfully');
      
      // Verify the app configuration includes measurementId before proceeding
      console.log('[Firebase Analytics] Verifying measurementId in configuration...');
      const config = getFirebaseConfig();
      console.log('[Firebase Analytics] Configuration check:', {
        hasMeasurementId: !!config.measurementId,
        measurementId: config.measurementId,
        measurementIdType: typeof config.measurementId,
        measurementIdLength: config.measurementId?.length
      });
      
      if (!config.measurementId) {
        console.log('[Firebase Analytics] Analytics not initialized - no measurementId in config');
        console.log('[Firebase Analytics] This is expected for non-web platforms or when Analytics is disabled');
        return undefined;
      }
      
      // Ensure the Firebase app is fully initialized before proceeding
      console.log('[Firebase Analytics] Firebase app ready, initializing Analytics...');
      console.log('[Firebase Analytics] About to call getAnalytics() with app instance');
      console.log('[Firebase Analytics] App instance details:', {
        appName: appInstance.name,
        hasOptions: !!appInstance.options,
        projectId: appInstance.options?.projectId
      });
      
      analyticsInstance = getAnalytics(appInstance);
      
      console.log('[Firebase Analytics] Firebase Analytics initialized successfully');
      console.log('[Firebase Analytics] Analytics instance created:', {
        hasApp: !!analyticsInstance.app,
        appName: analyticsInstance.app?.name
      });
    } catch (error) {
      console.error('[Firebase Analytics] Analytics initialization failed:', error);
      console.error('[Firebase Analytics] Analytics error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name
      });
      
      // Log additional context that might help debug the 'G' variable issue
      console.error('[Firebase Analytics] Additional debug context:', {
        currentUrl: typeof window !== "undefined" ? window.location?.href : 'N/A',
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent?.substring(0, 100) : 'N/A',
        timestamp: new Date().toISOString()
      });
      
      // Ensure we don't leave analyticsInstance in a partial state
      console.log('[Firebase Analytics] Cleaning up failed Analytics instance...');
      analyticsInstance = undefined;
      return undefined;
    }
  } else {
    console.log('[Firebase Analytics] Returning existing Analytics instance');
  }
  
  console.log('[Firebase Analytics] getAnalyticsInstance completed, returning:', !!analyticsInstance);
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