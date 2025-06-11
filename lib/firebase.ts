import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import Constants from "expo-constants";

// Firebase configuration from app.config.js - lazily evaluated to avoid initialization issues
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
  
  // For web platforms, ensure measurementId is only included if Analytics will be used
  if (typeof window !== "undefined") {
    return config;
  } else {
    // For non-web platforms, exclude measurementId to avoid potential issues
    const { measurementId, ...configWithoutMeasurementId } = config;
    return configWithoutMeasurementId;
  }
};

// Lazy initialization - nothing is initialized at module load time
let app: FirebaseApp | undefined = undefined;
let authInstance: Auth | undefined = undefined;
let dbInstance: Firestore | undefined = undefined;
let analyticsInstance: Analytics | undefined = undefined;

const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    try {
      console.log('[Firebase] Initializing Firebase app...');
      const firebaseConfig = getFirebaseConfig();
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

export const getAnalyticsInstance = (): Analytics | undefined => {
  if (typeof window === "undefined") {
    console.log('[Firebase] Analytics not available - not in browser environment');
    return undefined;
  }
  
  if (!analyticsInstance) {
    try {
      console.log('[Firebase] Initializing Firebase Analytics...');
      
      // Get Firebase app instance first and ensure it's fully initialized
      const appInstance = getFirebaseApp();
      if (!appInstance) {
        console.error('[Firebase] Cannot initialize Analytics - Firebase app not available');
        return undefined;
      }
      
      // Ensure the Firebase app is fully initialized before proceeding
      console.log('[Firebase] Firebase app ready, initializing Analytics...');
      analyticsInstance = getAnalytics(appInstance);
      
      console.log('[Firebase] Firebase Analytics initialized successfully');
    } catch (error) {
      console.error('[Firebase] Analytics initialization failed:', error);
      console.error('[Firebase] Analytics error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      
      // Ensure we don't leave analyticsInstance in a partial state
      analyticsInstance = undefined;
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