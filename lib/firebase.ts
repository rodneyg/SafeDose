import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
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
  };
  
  console.log('[Firebase Config] Raw config loaded:', {
    hasApiKey: !!config.apiKey,
    hasAuthDomain: !!config.authDomain,
    hasProjectId: !!config.projectId,
    hasAppId: !!config.appId,
  });
  
  const finalConfig = {
    ...config,
  };
  console.log('[Firebase Config] Final config:', {
    ...finalConfig,
    apiKey: finalConfig.apiKey ? '[REDACTED]' : undefined
  });
  return finalConfig;
};



// Lazy initialization - nothing is initialized at module load time
let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;

export const getFirebaseApp = (): FirebaseApp => {
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
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name,
        errorType: typeof error,
        errorConstructor: (error as any)?.constructor?.name
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
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name,
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
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        name: (error as any)?.name,
        errorType: typeof error
      });
      throw error;
    }
  } else {
    console.log('[Firebase Firestore] Returning existing Firestore instance');
  }
  
  return dbInstance;
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