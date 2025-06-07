export interface DoseLog {
  id: string;
  userId?: string;
  substanceName: string;
  doseValue: number;
  unit: string;
  calculatedVolume: number;
  timestamp: string;
  notes?: string; // Optional notes entered by user at logging time
}

export interface DoseLogContext {
  substanceName: string;
  doseValue: number | null;
  unit: string;
  calculatedVolume: number | null;
}