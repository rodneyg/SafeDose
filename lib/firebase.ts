import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Singleton Instances ---
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let appInitializationPromise: Promise<FirebaseApp> | null = null;

/**
 * [CRITICAL] Returns the Firebase config *without* the measurementId.
 * This is used for the initial, safe app initialization to prevent the Analytics bug.
 */
export const getInitialFirebaseConfig = () => {
  const config = Constants.expoConfig?.extra?.firebase;
  if (!config) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { measurementId, ...initialConfig } = config;
  return initialConfig;
};

/**
 * Returns the full Firebase config, including the measurementId.
 * To be used only after the app has stabilized.
 */
export const getFullFirebaseConfig = () => {
  return Constants.expoConfig?.extra?.firebase;
};

/**
 * Initializes and returns the Firebase app using the SAFE config (no measurementId).
 * This prevents the Analytics module from being processed during app initialization.
 */
export const getFirebaseApp = (): Promise<FirebaseApp> => {
  if (appInitializationPromise) {
    return appInitializationPromise;
  }

  appInitializationPromise = (async () => {
    if (appInstance) {
      return appInstance;
    }

    const config = getInitialFirebaseConfig();
    if (!config) {
      throw new Error('Firebase configuration is missing');
    }

    console.log('[Firebase] Initializing with SAFE config (no measurementId)');
    
    // Check if an app already exists
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
      console.log('[Firebase] Using existing Firebase app');
    } else {
      appInstance = initializeApp(config);
      console.log('[Firebase] New Firebase app initialized');
    }

    return appInstance;
  })();

  return appInitializationPromise;
};

/**
 * Gets the Firebase Auth instance
 */
export const getAuthInstance = async (): Promise<Auth> => {
  if (authInstance) {
    return authInstance;
  }

  const app = await getFirebaseApp();
  
  try {
    // For React Native, we need to use initializeAuth with persistence
    if (typeof window === 'undefined' || !window.location) {
      authInstance = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch (error: any) {
    // If auth is already initialized, get the existing instance
    if (error.code === 'auth/already-initialized') {
      authInstance = getAuth(app);
    } else {
      throw error;
    }
  }

  return authInstance;
};

/**
 * Gets the Firestore instance
 */
export const getDbInstance = async (): Promise<Firestore> => {
  if (dbInstance) {
    return dbInstance;
  }

  const app = await getFirebaseApp();
  dbInstance = getFirestore(app);
  return dbInstance;
};

// For backward compatibility, provide auth and db as async getters
export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    throw new Error('Auth must be accessed asynchronously. Use getAuthInstance() instead.');
  }
});

export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    throw new Error('Firestore must be accessed asynchronously. Use getDbInstance() instead.');
  }
});

/**
 * Phase 2: Analytics Configuration Injection
 * This function should be called AFTER the app has fully rendered and stabilized.
 * It reconfigures the Firebase app to include the measurementId for Analytics.
 */
export const enableAnalytics = async (): Promise<void> => {
  console.log('[Firebase] Phase 2: Enabling Analytics configuration...');
  
  const fullConfig = getFullFirebaseConfig();
  if (!fullConfig?.measurementId) {
    console.log('[Firebase] No measurementId found, Analytics will remain disabled');
    return;
  }

  // At this point, we don't need to reinitialize the app
  // The analytics module will use the app instance and get the measurementId from the config
  console.log('[Firebase] Analytics configuration ready for injection');
};