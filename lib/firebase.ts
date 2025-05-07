import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
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

// Export Firebase auth and analytics
export const auth = getAuth(app);
export const analytics = typeof window !== "undefined"
  ? getAnalytics(app)
  : undefined;