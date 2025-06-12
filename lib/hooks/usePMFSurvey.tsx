import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, collection } from 'firebase/firestore';
import { addDocWithEnv } from '../firestoreWithEnv';
import { useAuth } from '../../contexts/AuthContext';
import { PMFSurveyResponse, PMFSurveyTriggerData, PMFSurveyState } from '../../types/pmf-survey';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';

const PMF_STORAGE_KEY = 'pmf_survey_data';
const PMF_SESSION_COUNT_KEY = 'pmf_session_count';

export function usePMFSurvey() {
  const { user } = useAuth();
  const db = getFirestore();
  const [triggerData, setTriggerData] = useState<PMFSurveyTriggerData>({
    sessionCount: 0,
    lastSessionType: 'manual',
    shouldShowSurvey: false,
    hasShownBefore: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load PMF survey state from local storage
  const loadPMFState = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const pmfData = await AsyncStorage.getItem(`${PMF_STORAGE_KEY}_${userId}`);
      const sessionCount = await AsyncStorage.getItem(`${PMF_SESSION_COUNT_KEY}_${userId}`);
      
      const parsedData = pmfData ? JSON.parse(pmfData) : { hasShownBefore: false };
      const currentSessionCount = sessionCount ? parseInt(sessionCount, 10) : 0;
      
      setTriggerData(prev => ({
        ...prev,
        sessionCount: currentSessionCount,
        hasShownBefore: parsedData.hasShownBefore || false,
        shouldShowSurvey: shouldTriggerSurvey(currentSessionCount, parsedData.hasShownBefore),
      }));
    } catch (error) {
      console.error('Error loading PMF state:', error);
    }
  }, [user]);

  // Determine if survey should be triggered
  const shouldTriggerSurvey = (sessionCount: number, hasShown: boolean): boolean => {
    if (hasShown) return false;
    return sessionCount === 2;
  };

  // Record a dose session completion
  const recordDoseSession = useCallback(async (sessionType: 'scan' | 'manual') => {
    try {
      const userId = user?.uid || 'anonymous';
      const currentCount = triggerData.sessionCount + 1;
      
      await AsyncStorage.setItem(`${PMF_SESSION_COUNT_KEY}_${userId}`, currentCount.toString());
      
      const newTriggerData = {
        sessionCount: currentCount,
        lastSessionType: sessionType,
        shouldShowSurvey: shouldTriggerSurvey(currentCount, triggerData.hasShownBefore),
        hasShownBefore: triggerData.hasShownBefore,
      };
      
      setTriggerData(newTriggerData);
      
      console.log('PMF session recorded:', { sessionCount: currentCount, sessionType, shouldShow: newTriggerData.shouldShowSurvey });
      
      return newTriggerData;
    } catch (error) {
      console.error('Error recording dose session:', error);
      return triggerData;
    }
  }, [user, triggerData]);

  // Mark survey as shown
  const markSurveyShown = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const pmfData = { hasShownBefore: true, shownAt: new Date().toISOString() };
      await AsyncStorage.setItem(`${PMF_STORAGE_KEY}_${userId}`, JSON.stringify(pmfData));
      
      setTriggerData(prev => ({
        ...prev,
        hasShownBefore: true,
        shouldShowSurvey: false,
      }));

      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SHOWN, {
        sessionCount: triggerData.sessionCount,
        lastSessionType: triggerData.lastSessionType,
        userId: user?.uid,
        isAnonymous: !user || user.isAnonymous,
      });
    } catch (error) {
      console.error('Error marking survey as shown:', error);
    }
  }, [user, triggerData]);

  // Submit PMF survey response
  const submitPMFSurvey = useCallback(async (
    responses: PMFSurveyResponse['responses']
  ): Promise<void> => {
    console.log('submitPMFSurvey called with responses:', responses);
    
    if (isSubmitting) {
      console.log('Already submitting, skipping...');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Generate unique session ID
      const sessionId = `pmf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const surveyResponse: PMFSurveyResponse = {
        id: sessionId,
        userId: user?.uid,
        sessionId,
        deviceType: 'web', // Could be enhanced to detect actual device type
        timestamp: new Date().toISOString(),
        responses,
        metadata: {
          sessionCount: triggerData.sessionCount,
          scanFlow: triggerData.lastSessionType === 'scan',
          completedAt: new Date().toISOString(),
        },
      };

      // Save to Firebase (for all users including anonymous)
      try {
        console.log('Attempting to save PMF survey to Firebase...', { 
          sessionId, 
          userId: user?.uid || 'anonymous', 
          surveyResponse 
        });
        const pmfCollection = collection(db, 'pmf_survey_responses');
        const docRef = await addDocWithEnv(pmfCollection, surveyResponse);
        console.log('PMF survey saved to Firebase successfully:', { 
          sessionId, 
          docId: docRef.id,
          collection: 'pmf_survey_responses'
        });
      } catch (error) {
        console.error('Error saving PMF survey to Firebase:', {
          error,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: (error as any)?.code,
          userId: user?.uid || 'anonymous',
          sessionId
        });
        // Don't throw error - survey submission should be non-blocking
      }

      // Mark as completed locally
      await markSurveyShown();

      // Analytics
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_COMPLETED, {
        sessionCount: triggerData.sessionCount,
        lastSessionType: triggerData.lastSessionType,
        userId: user?.uid,
        isAnonymous: !user || user.isAnonymous,
        hasDisappointmentResponse: !!responses.disappointment,
        hasBenefitPersonResponse: !!responses.benefitPerson,
        hasMainBenefitResponse: !!responses.mainBenefit,
        hasImprovementsResponse: !!responses.improvements,
      });

    } catch (error) {
      console.error('Error submitting PMF survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, db, triggerData, isSubmitting, markSurveyShown]);

  // Skip/dismiss survey
  const skipPMFSurvey = useCallback(async () => {
    try {
      await markSurveyShown();

      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SKIPPED, {
        sessionCount: triggerData.sessionCount,
        lastSessionType: triggerData.lastSessionType,
        userId: user?.uid,
        isAnonymous: !user || user.isAnonymous,
      });
    } catch (error) {
      console.error('Error skipping PMF survey:', error);
    }
  }, [markSurveyShown, triggerData, user]);

  // Initialize on mount
  useEffect(() => {
    loadPMFState();
  }, [loadPMFState]);

  return {
    triggerData,
    recordDoseSession,
    markSurveyShown,
    submitPMFSurvey,
    skipPMFSurvey,
    isSubmitting,
  };
}