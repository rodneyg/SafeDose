export interface DosePreset {
  id: string;
  userId?: string;
  name: string;
  substanceName: string;
  doseValue: number;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationValue?: number | null;
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number | null;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
  solutionVolume?: number | null;
  notes?: string;
  timestamp: string;
  firestoreId?: string; // For future cloud sync if needed
}

export interface PresetFormData {
  name: string;
  notes?: string;
}