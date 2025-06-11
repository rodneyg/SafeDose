import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
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

// Lazy-initialize analytics to prevent initialization order issues
let analyticsInstance: ReturnType<typeof getAnalytics> | undefined = undefined;

export const getAnalyticsInstance = () => {
  if (typeof window === "undefined") {
    return undefined;
  }
  
  if (!analyticsInstance) {
    try {
      analyticsInstance = getAnalytics(app);
    } catch (error) {
      console.warn('[Firebase] Analytics initialization failed:', error);
      return undefined;
    }
  }
  
  return analyticsInstance;
};