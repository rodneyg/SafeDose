import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';
import type { 
  CombinedOnboardingSurveyTriggerData,
  CombinedOnboardingSurveyResponses,
  CombinedOnboardingSurveyStorageData,
  WhyAreYouHereResponse
} from '../../types/combined-onboarding-survey';

const COMBINED_SURVEY_STORAGE_KEY = 'combinedOnboardingSurvey';
const COMBINED_SURVEY_SESSION_COUNT_KEY = 'combinedOnboardingSurveySessionCount';

export function useCombinedOnboardingSurvey() {
  const { user } = useAuth();
  const [triggerData, setTriggerData] = useState<CombinedOnboardingSurveyTriggerData>({
    sessionCount: 0,
    lastSessionType: 'manual',
    shouldShowSurvey: false,
    hasShownBefore: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load survey state from local storage
  const loadSurveyState = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const surveyData = await AsyncStorage.getItem(`${COMBINED_SURVEY_STORAGE_KEY}_${userId}`);
      const sessionCount = await AsyncStorage.getItem(`${COMBINED_SURVEY_SESSION_COUNT_KEY}_${userId}`);
      
      const parsedData: CombinedOnboardingSurveyStorageData = surveyData ? JSON.parse(surveyData) : { hasShownBefore: false };
      const currentSessionCount = sessionCount ? parseInt(sessionCount, 10) : 0;
      
      setTriggerData(prev => ({
        ...prev,
        sessionCount: currentSessionCount,
        hasShownBefore: parsedData.hasShownBefore || false,
        shouldShowSurvey: shouldTriggerSurvey(currentSessionCount, parsedData.hasShownBefore),
      }));
    } catch (error) {
      console.error('Error loading combined survey state:', error);
    }
  }, [user]);

  // Determine if survey should be triggered
  const shouldTriggerSurvey = (sessionCount: number, hasShown: boolean): boolean => {
    if (hasShown) return false;
    return sessionCount === 2; // Show after 2nd dose (same as PMF survey logic)
  };

  // Record a dose session completion
  const recordDoseSession = useCallback(async (sessionType: 'scan' | 'manual') => {
    try {
      const userId = user?.uid || 'anonymous';
      const currentCount = triggerData.sessionCount + 1;
      
      await AsyncStorage.setItem(`${COMBINED_SURVEY_SESSION_COUNT_KEY}_${userId}`, currentCount.toString());
      
      const newTriggerData = {
        sessionCount: currentCount,
        lastSessionType: sessionType,
        shouldShowSurvey: shouldTriggerSurvey(currentCount, triggerData.hasShownBefore),
        hasShownBefore: triggerData.hasShownBefore,
      };
      
      setTriggerData(newTriggerData);
      
      console.log('Combined survey session recorded:', { sessionCount: currentCount, sessionType, shouldShow: newTriggerData.shouldShowSurvey });
      
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
      const surveyData: CombinedOnboardingSurveyStorageData = { 
        hasShownBefore: true, 
        shownAt: new Date().toISOString() 
      };
      await AsyncStorage.setItem(`${COMBINED_SURVEY_STORAGE_KEY}_${userId}`, JSON.stringify(surveyData));
      
      setTriggerData(prev => ({
        ...prev,
        hasShownBefore: true,
        shouldShowSurvey: false,
      }));
    } catch (error) {
      console.error('Error marking combined survey as shown:', error);
    }
  }, [user]);

  // Submit combined survey with separate analytics for backward compatibility
  const submitCombinedSurvey = useCallback(async (responses: CombinedOnboardingSurveyResponses) => {
    setIsSubmitting(true);
    try {
      const userId = user?.uid || 'anonymous';
      
      // Store the combined responses
      const surveyData: CombinedOnboardingSurveyStorageData = {
        hasShownBefore: true,
        completedAt: new Date().toISOString(),
        responses,
      };
      await AsyncStorage.setItem(`${COMBINED_SURVEY_STORAGE_KEY}_${userId}`, JSON.stringify(surveyData));
      
      // Log separate analytics events for backward compatibility
      
      // Log Why Are You Here analytics
      if (responses.whyAreYouHere) {
        logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_RESPONSE, {
          response: responses.whyAreYouHere.response,
          hasCustomText: responses.whyAreYouHere.response === 'other' && 
                        responses.whyAreYouHere.customText && 
                        responses.whyAreYouHere.customText.trim().length > 0,
        });
      }
      
      // Log PMF Survey analytics
      if (responses.pmf) {
        logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_COMPLETED, {
          sessionCount: triggerData.sessionCount,
          responses: responses.pmf,
        });
      }
      
      // Update state
      setTriggerData(prev => ({
        ...prev,
        hasShownBefore: true,
        shouldShowSurvey: false,
      }));
      
      console.log('Combined survey completed and stored for user:', userId);
    } catch (error) {
      console.error('Error submitting combined survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, triggerData.sessionCount]);

  // Skip survey
  const skipSurvey = useCallback(async () => {
    try {
      const userId = user?.uid || 'anonymous';
      const surveyData: CombinedOnboardingSurveyStorageData = {
        hasShownBefore: true,
        skippedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(`${COMBINED_SURVEY_STORAGE_KEY}_${userId}`, JSON.stringify(surveyData));
      
      // Log skip analytics for both surveys
      logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SKIPPED);
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SKIPPED, {
        sessionCount: triggerData.sessionCount,
      });
      
      setTriggerData(prev => ({
        ...prev,
        hasShownBefore: true,
        shouldShowSurvey: false,
      }));
      
      console.log('Combined survey skipped');
    } catch (error) {
      console.error('Error skipping combined survey:', error);
    }
  }, [user, triggerData.sessionCount]);

  // Load state on mount
  useEffect(() => {
    loadSurveyState();
  }, [loadSurveyState]);

  return {
    triggerData,
    recordDoseSession,
    submitCombinedSurvey,
    skipSurvey,
    markSurveyShown,
    isSubmitting,
  };
}