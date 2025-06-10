import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from './analytics';

export interface Lead {
  email: string;
  timestamp: any; // Firebase serverTimestamp
  scanLimitHit: boolean;
  userType: 'anon' | 'google';
  source: string;
  exitSurveyResponse?: string;
}

/**
 * Save a lead to Firebase leads collection
 * @param email - User's email address
 * @param isAnonymous - Whether the user is anonymous
 * @param exitSurveyResponse - Optional exit survey response
 * @returns Promise<string> - Document ID of the saved lead
 */
export const saveLead = async (
  email: string,
  isAnonymous: boolean,
  exitSurveyResponse?: string
): Promise<string> => {
  try {
    console.log('[Leads] Attempting to save lead:', { email, isAnonymous, exitSurveyResponse });
    
    logAnalyticsEvent(ANALYTICS_EVENTS.EMAIL_CAPTURE_ATTEMPTED, {
      userType: isAnonymous ? 'anon' : 'google',
      hasExitSurvey: !!exitSurveyResponse,
    });

    const leadData: Lead = {
      email,
      timestamp: serverTimestamp(),
      scanLimitHit: true,
      userType: isAnonymous ? 'anon' : 'google',
      source: 'upgrade_modal',
      ...(exitSurveyResponse && { exitSurveyResponse }),
    };

    const docRef = await addDoc(collection(db, 'leads'), leadData);
    
    console.log('[Leads] Lead saved successfully with ID:', docRef.id);
    
    logAnalyticsEvent(ANALYTICS_EVENTS.EMAIL_CAPTURE_SUCCESS, {
      userType: isAnonymous ? 'anon' : 'google',
      hasExitSurvey: !!exitSurveyResponse,
      leadId: docRef.id,
    });

    if (exitSurveyResponse) {
      logAnalyticsEvent(ANALYTICS_EVENTS.EXIT_SURVEY_SUBMITTED, {
        userType: isAnonymous ? 'anon' : 'google',
        responseLength: exitSurveyResponse.length,
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('[Leads] Failed to save lead:', error);
    
    logAnalyticsEvent(ANALYTICS_EVENTS.EMAIL_CAPTURE_FAILED, {
      userType: isAnonymous ? 'anon' : 'google',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    throw error;
  }
};

/**
 * Validate email format
 * @param email - Email to validate
 * @returns boolean - Whether email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};