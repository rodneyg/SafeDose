export interface DosePreset {
  id: string;
  name: string;
  substanceName: string;
  doseValue: number;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationValue?: number;
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
  solutionVolume?: number;
  notes?: string;
  timestamp: string;
}

export interface PresetFormData {
  name: string;
  notes?: string;
}