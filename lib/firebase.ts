import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import Constants from "expo-constants";
import { FeedbackEntry } from '../types/feedback';

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

// Export Firebase auth, analytics, and firestore
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined"
  ? getAnalytics(app)
  : undefined;

/**
 * Adds a user's feedback to Firestore.
 * @param feedbackData - The feedback data, excluding userId and timestamp.
 * @param userId - The ID of the user submitting the feedback.
 * @returns True if successful, false otherwise.
 */
export const addUserFeedback = async (
  feedbackData: Omit<FeedbackEntry, 'timestamp' | 'userId'>,
  userId: string
): Promise<boolean> => {
  try {
    const timestamp = new Date();
    const feedbackEntry: FeedbackEntry = {
      ...feedbackData,
      userId,
      timestamp,
    };

    const feedbackCollectionRef = collection(db, 'userFeedback');
    await addDoc(feedbackCollectionRef, feedbackEntry);
    console.log("Feedback added successfully with ID: ", feedbackEntry.userId, feedbackEntry.timestamp);
    return true;
  } catch (error) {
    console.error("Error adding feedback: ", error);
    return false;
  }
};