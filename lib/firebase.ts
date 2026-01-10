import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics as FirebaseAnalytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import Constants from "expo-constants";

// Firebase configuration from app.config.js
const firebaseConfig = Constants.expoConfig?.extra?.firebase || {
  apiKey: "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
  authDomain: "safedose-e320d.firebaseapp.com",
  projectId: "safedose-e320d",
  storageBucket: "safedose-e320d.firebasestorage.app",
  messagingSenderId: "704055775889",
  appId: "1:704055775889:web:6ff0d3de5fea40b5b56530",
  measurementId: "G-WRY88Q57KK",
};

// Lazy initialization - nothing is initialized at module load time
let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let analyticsInstance: FirebaseAnalytics | undefined = undefined;

const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    try {
      console.log('[Firebase] Initializing Firebase app...');
      app = initializeApp(firebaseConfig);
      console.log('[Firebase] Firebase app initialized successfully');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firebase app:', error);
      console.error('[Firebase] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      throw error;
    }
  }
  return app;
};

export const getAuthInstance = (): Auth => {
  if (!authInstance) {
    try {
      console.log('[Firebase] Initializing Firebase Auth...');
      authInstance = getAuth(getFirebaseApp());
      console.log('[Firebase] Firebase Auth initialized successfully');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firebase Auth:', error);
      throw error;
    }
  }
  return authInstance;
};

export const getDbInstance = (): Firestore => {
  if (!dbInstance) {
    try {
      console.log('[Firebase] Initializing Firestore...');
      dbInstance = getFirestore(getFirebaseApp());
      console.log('[Firebase] Firestore initialized successfully');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firestore:', error);
      throw error;
    }
  }
  return dbInstance;
};

export const getAnalyticsInstance = (): FirebaseAnalytics | undefined => {
  if (typeof window === "undefined") {
    console.log('[Firebase] Analytics not available - not in browser environment');
    return undefined;
  }
  
  if (!analyticsInstance) {
    console.log('[Firebase] Attempting to initialize Firebase Analytics...');
    try {
      console.log('[Firebase] Calling getFirebaseApp() for Analytics initialization.');
      const currentApp = getFirebaseApp();
      console.log('[Firebase] Firebase app obtained for Analytics initialization. App ID: ' + (currentApp ? currentApp.name : 'undefined_app'));
      if (typeof getAnalytics !== 'function') {
        const errorMsg = '[Firebase] CRITICAL ERROR: getAnalytics function from firebase/analytics is not available or not a function at the time of call.';
        console.error(errorMsg);
        console.error('[Firebase] typeof getAnalytics:', typeof getAnalytics);
        // Log current state of firebase related instances
        console.error('[Firebase] Current app instance:', app ? 'initialized' : 'undefined');
        console.error('[Firebase] Current auth instance:', authInstance ? 'initialized' : 'undefined');
        console.error('[Firebase] Current db instance:', dbInstance ? 'initialized' : 'undefined');
        console.error('[Firebase] Current analytics instance (should be undefined here):', analyticsInstance ? 'initialized' : 'undefined');
        throw new Error(errorMsg); // Throwing to make it a hard stop, as this is unexpected
      }
      console.log('[Firebase] getAnalytics function is available. Proceeding to call getAnalytics(currentApp).');
      analyticsInstance = getAnalytics(currentApp);
      console.log('[Firebase] Firebase Analytics initialized successfully');
    } catch (error) {
      console.error('[Firebase] Analytics initialization failed:', error);
      const err = error as any; // To access potential non-standard properties
      console.error('[Firebase] Analytics error details:', {
        message: err.message || 'No message',
        stack: err.stack || 'No stack',
        name: err.name || 'No name',
        code: err.code || 'No code',
        // Log the error object itself if it has other properties
        errorObject: err
      });
      return undefined;
    }
  }
  
  return analyticsInstance;
};

// For backward compatibility, provide auth and db as getters
// These will initialize on first access rather than at module load time
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    return getAuthInstance()[prop as keyof Auth];
  }
});

export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    return getDbInstance()[prop as keyof Firestore];
  }
});