import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getFirestore } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import type { OnboardingSurveyResult, PMFSurveyResponse } from '../../types/pmf-survey';
import { ANALYTICS_EVENTS, logAnalyticsEvent } from '../analytics';
import { addDocWithEnv } from '../firestoreWithEnv';

type SurveyPrompt = {
  storageId: string;
  userId?: string;
  isAnonymous: boolean;
  sessionCount: number;
  lastSessionType: 'manual' | 'scan';
  includeWhyHere: boolean;
};

export function useOnboardingSurvey() {
  const { user } = useAuth();
  const userId = user?.uid;
  const storageId = userId || 'anonymous';
  const isAnonymous = !user || user.isAnonymous;
  const currentStorageId = useRef(storageId);
  const opening = useRef(new Set<string>());
  const active = useRef<SurveyPrompt | null>(null);
  const [prompt, setPrompt] = useState<SurveyPrompt | null>(null);

  useLayoutEffect(() => {
    currentStorageId.current = storageId;
    active.current = null;
    setPrompt(null);
    return () => { currentStorageId.current = ''; };
  }, [storageId]);

  const offerSurvey = useCallback(async (
    sessionCount: number | undefined,
    lastSessionType: SurveyPrompt['lastSessionType'],
  ) => {
    if (sessionCount !== 2 || currentStorageId.current !== storageId || opening.current.has(storageId)) return;

    opening.current.add(storageId);
    try {
      const pmfKey = `pmf_survey_data_${storageId}`;
      const whyHereKey = `whyAreYouHerePromptShown_${storageId}`;
      const [[, pmfData], [, whyHereShown]] = await AsyncStorage.multiGet([pmfKey, whyHereKey]);
      if (currentStorageId.current !== storageId || (pmfData && JSON.parse(pmfData)?.hasShownBefore)) return;

      // Reuse the PMF marker so earlier completions and skips remain honored.
      await AsyncStorage.setItem(pmfKey, JSON.stringify({ hasShownBefore: true, shownAt: new Date().toISOString() }));
      if (currentStorageId.current !== storageId) return;

      const includeWhyHere = whyHereShown !== 'true';
      const nextPrompt = { storageId, userId, isAnonymous, sessionCount, lastSessionType, includeWhyHere };
      active.current = nextPrompt;
      setPrompt(nextPrompt);

      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SHOWN, { sessionCount, lastSessionType, userId, isAnonymous });
      if (includeWhyHere) {
        logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SHOWN, { userId: storageId, isAnonymous });
      }
    } catch (error) {
      console.error('Error opening onboarding survey:', error);
    } finally {
      opening.current.delete(storageId);
    }
  }, [storageId, userId, isAnonymous]);

  const finishSurvey = useCallback(async ({ whyHere, pmf, questionIndex }: OnboardingSurveyResult) => {
    const current = active.current;
    if (!current || current.storageId !== storageId) return;

    active.current = null;
    setPrompt(null);
    const { userId, isAnonymous, sessionCount, lastSessionType, includeWhyHere } = current;
    const analytics = { userId, isAnonymous, sessionCount, lastSessionType };
    const timestamp = new Date().toISOString();

    if (includeWhyHere) {
      if (whyHere) {
        const { response, customText } = whyHere;
        logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_RESPONSE, { response, hasCustomText: !!customText });
        void AsyncStorage.setItem(`whyAreYouHereResponse_${storageId}`, JSON.stringify({
          response, customText: customText || null, timestamp, userId: storageId, isAnonymous,
        })).catch(error => console.error('Error saving onboarding response:', error));
      } else {
        logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SKIPPED);
      }
      void AsyncStorage.setItem(`whyAreYouHerePromptShown_${storageId}`, 'true')
        .catch(error => console.error('Error marking onboarding question as shown:', error));
    }

    if (!pmf) {
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_DISMISSED, { questionIndex, totalQuestions: 4, sessionCount });
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SKIPPED, analytics);
      return;
    }

    const sessionId = `pmf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const surveyResponse: PMFSurveyResponse = {
      id: sessionId,
      ...(userId ? { userId } : {}),
      sessionId,
      deviceType: 'web',
      timestamp,
      responses: pmf,
      metadata: { sessionCount, scanFlow: lastSessionType === 'scan', completedAt: timestamp },
    };
    logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_COMPLETED, {
      ...analytics,
      hasDisappointmentResponse: !!pmf.disappointment,
      hasBenefitPersonResponse: !!pmf.benefitPerson,
      hasMainBenefitResponse: !!pmf.mainBenefit,
      hasImprovementsResponse: !!pmf.improvements,
    });
    try {
      await addDocWithEnv(collection(getFirestore(), 'pmf_survey_responses'), surveyResponse);
    } catch (error) {
      console.error('Error saving PMF survey:', error);
    }
  }, [storageId]);

  return { prompt: prompt?.storageId === storageId ? prompt : null, offerSurvey, finishSurvey };
}
