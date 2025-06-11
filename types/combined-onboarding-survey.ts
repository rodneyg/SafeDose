export type WhyAreYouHereResponse = 
  | 'reddit'
  | 'twitter'
  | 'friend'
  | 'clean_calculator'
  | 'ai_scan'
  | 'dose_logs'
  | 'comparing_tools'
  | 'other';

export interface CombinedOnboardingSurveyResponses {
  // Why Are You Here question
  whyAreYouHere?: {
    response: WhyAreYouHereResponse;
    customText?: string;
  };
  
  // PMF Survey questions
  pmf?: {
    disappointment?: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed';
    benefitPerson?: string;
    mainBenefit?: string;
    improvements?: string;
  };
}

export interface CombinedOnboardingSurveyState {
  currentStep: number; // 0-4 (Why Are You Here + 4 PMF questions)
  responses: CombinedOnboardingSurveyResponses;
  isCompleted: boolean;
  isSkipped: boolean;
}

export interface CombinedOnboardingSurveyTriggerData {
  sessionCount: number;
  lastSessionType: 'scan' | 'manual';
  shouldShowSurvey: boolean;
  hasShownBefore: boolean;
}

export interface CombinedOnboardingSurveyStorageData {
  hasShownBefore: boolean;
  shownAt?: string;
  completedAt?: string;
  skippedAt?: string;
  responses?: CombinedOnboardingSurveyResponses;
}