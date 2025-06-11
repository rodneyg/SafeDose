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

export interface PMFSurveyState {
  currentQuestion: number;
  responses: PMFSurveyResponse['responses'];
  isCompleted: boolean;
  isSkipped: boolean;
}

export interface PMFSurveyTriggerData {
  sessionCount: number;
  lastSessionType: 'scan' | 'manual';
  shouldShowSurvey: boolean;
  hasShownBefore: boolean;
}