import type { DoseLogContext } from './doseLog';

export type FeedbackType = 'great' | 'mild_side_effects' | 'something_wrong';

export interface DoseFeedback {
  id: string;
  userId?: string;
  feedbackType: FeedbackType;
  notes?: string;
  timestamp: string;
  doseInfo: {
    substanceName: string;
    doseValue: number;
    unit: string;
    calculatedVolume: number;
  };
}

export interface FeedbackContextType {
  nextAction: 'new_dose' | 'scan_again' | 'start_over';
  doseInfo: DoseLogContext;
}
