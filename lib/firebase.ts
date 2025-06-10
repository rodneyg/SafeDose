import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Firebase auth and firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize analytics with proper support checking
let analytics: any = undefined;

// Initialize analytics asynchronously for web
const initializeAnalytics = async () => {
  try {
    if (typeof window !== "undefined") {
      const analyticsSupported = await isSupported();
      if (analyticsSupported) {
        analytics = getAnalytics(app);
        console.log('[Firebase] Analytics initialized for web');
      } else {
        console.log('[Firebase] Analytics not supported in this web environment');
      }
    }
  } catch (error) {
    console.warn('[Firebase] Analytics initialization failed:', error);
  }
};

// Initialize analytics on web
if (typeof window !== "undefined") {
  initializeAnalytics();
}

export { analytics };