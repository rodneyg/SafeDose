import { useState, useCallback } from 'react';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DoseFeedback, FeedbackType } from '../../types/feedback';

export function useFeedbackStorage() {
  const { user } = useAuth();
  const db = getFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save feedback to local storage
  const saveFeedbackLocally = useCallback(async (feedback: DoseFeedback) => {
    try {
      const storageKey = `feedback_${user?.uid || 'anonymous'}`;
      const existingFeedback = await AsyncStorage.getItem(storageKey);
      const feedbackList: DoseFeedback[] = existingFeedback ? JSON.parse(existingFeedback) : [];
      
      feedbackList.push(feedback);
      
      // Keep only the last 50 feedback entries to prevent storage bloat
      if (feedbackList.length > 50) {
        feedbackList.splice(0, feedbackList.length - 50);
      }
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(feedbackList));
      console.log('Feedback saved locally:', feedback.id);
    } catch (error) {
      console.error('Error saving feedback locally:', error);
    }
  }, [user]);

  // Save feedback to Firestore (for authenticated users)
  const saveFeedbackToFirestore = useCallback(async (feedback: DoseFeedback) => {
    if (!user || user.isAnonymous) {
      console.log('Skipping Firestore save for anonymous user');
      return;
    }

    try {
      const feedbackCollection = collection(db, 'feedback');
      await addDoc(feedbackCollection, {
        ...feedback,
        userId: user.uid,
      });
      console.log('Feedback saved to Firestore:', feedback.id);
    } catch (error) {
      console.error('Error saving feedback to Firestore:', error);
      // Don't throw error - local storage is the fallback
    }
  }, [user, db]);

  // Submit feedback (saves to both local and cloud storage)
  const submitFeedback = useCallback(async (
    feedbackType: FeedbackType,
    doseInfo: {
      substanceName: string;
      doseValue: number | null;
      unit: string;
      calculatedVolume: number | null;
    },
    notes?: string
  ) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Only proceed if we have valid dose info
      if (!doseInfo.doseValue || !doseInfo.calculatedVolume) {
        console.warn('Incomplete dose info, skipping feedback submission');
        return;
      }

      const feedback: DoseFeedback = {
        id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user?.uid,
        feedbackType,
        notes,
        timestamp: new Date().toISOString(),
        doseInfo: {
          substanceName: doseInfo.substanceName,
          doseValue: doseInfo.doseValue,
          unit: doseInfo.unit,
          calculatedVolume: doseInfo.calculatedVolume,
        },
      };

      // Save locally first (always works)
      await saveFeedbackLocally(feedback);
      
      // Try to save to Firestore (for authenticated users)
      await saveFeedbackToFirestore(feedback);
      
      console.log('Feedback submitted successfully:', feedback.id);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // Don't throw - we want feedback collection to be non-blocking
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, user, saveFeedbackLocally, saveFeedbackToFirestore]);

  // Get feedback history from local storage
  const getFeedbackHistory = useCallback(async (): Promise<DoseFeedback[]> => {
    try {
      const storageKey = `feedback_${user?.uid || 'anonymous'}`;
      const feedbackData = await AsyncStorage.getItem(storageKey);
      return feedbackData ? JSON.parse(feedbackData) : [];
    } catch (error) {
      console.error('Error loading feedback history:', error);
      return [];
    }
  }, [user]);

  return {
    submitFeedback,
    getFeedbackHistory,
    isSubmitting,
  };
}