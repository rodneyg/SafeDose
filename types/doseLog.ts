// Injection site types following the specified 8-zone system
export type InjectionSite = 
  | 'abdomen_L' 
  | 'abdomen_R' 
  | 'thigh_L' 
  | 'thigh_R' 
  | 'glute_L' 
  | 'glute_R' 
  | 'arm_L' 
  | 'arm_R';

export interface DoseLog {
  id: string;
  userId?: string;
  substanceName: string;
  doseValue: number;
  unit: string;
  calculatedVolume: number;
  syringeType?: 'Insulin' | 'Standard'; // Type of syringe used
  insulinScale?: string;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
  concentrationExact?: string;
  recommendedMarking?: string; // The exact marking user should draw to
  injectionSite?: InjectionSite; // Body location for injection site rotation
  timestamp: string;
  notes?: string; // Optional notes entered by user at logging time
  firestoreId?: string; // Firestore document ID for sync purposes
  protocolOccurrence?: string;
  
  // Original user inputs for "Use Last Dose" feature
  medicationInputType?: 'concentration' | 'totalAmount'; // How user entered medication data
  concentrationAmount?: string; // Original concentration amount entered
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Original concentration unit
  totalAmount?: string; // Original total amount in vial
  solutionVolume?: string; // Original solution volume entered
}

export interface DoseLogContext {
  protocolOccurrence?: string;
  substanceName: string;
  doseValue: number | null;
  unit: string;
  calculatedVolume: number | null;
  syringeType?: 'Insulin' | 'Standard' | null;
  insulinScale?: string;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
  concentrationExact?: string;
  recommendedMarking?: string | null;
  injectionSite?: InjectionSite | null;
  
  // Original user inputs for "Use Last Dose" feature
  medicationInputType?: 'concentration' | 'totalAmount' | null;
  concentrationAmount?: string;
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: string;
  solutionVolume?: string;
}
/** Fields a user may correct on a saved dose log. */
export interface DoseLogEdit {
  timestamp?: string;
  doseValue?: number;
  injectionSite?: InjectionSite | null;
  notes?: string;
}
