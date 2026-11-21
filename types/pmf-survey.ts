export interface PMFSurveyResponse {
  id: string;
  userId?: string;
  sessionId: string;
  deviceType: string;
  timestamp: string;
  responses: {
    disappointment?: 'very_disappointed' | 'somewhat_disappointed' | 'not_disappointed';
    benefitPerson?: string; // Free text
    mainBenefit?: string; // Free text
    improvements?: string; // Free text
  };
  metadata: {
    sessionCount: number;
    scanFlow: boolean; // true if scan, false if manual
    completedAt?: string;
    skippedAt?: string;
  };
}

export type WhyAreYouHereResponse =
  | 'reddit'
  | 'twitter'
  | 'friend'
  | 'clean_calculator'
  | 'ai_scan'
  | 'dose_logs'
  | 'comparing_tools'
  | 'other';

export interface OnboardingSurveyResult {
  whyHere?: { response: WhyAreYouHereResponse; customText?: string };
  pmf?: Required<PMFSurveyResponse['responses']>;
  questionIndex: number;
}
