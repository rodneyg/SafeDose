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
  recommendedMarking?: string; // The exact marking user should draw to
  injectionSite?: InjectionSite; // Body location for injection site rotation
  timestamp: string;
  notes?: string; // Optional notes entered by user at logging time
  firestoreId?: string; // Firestore document ID for sync purposes
  
  // Original user inputs for "Use Last Dose" feature
  medicationInputType?: 'concentration' | 'totalAmount'; // How user entered medication data
  concentrationAmount?: string; // Original concentration amount entered
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Original concentration unit
  totalAmount?: string; // Original total amount in vial
  solutionVolume?: string; // Original solution volume entered
}

export interface DoseLogContext {
  substanceName: string;
  doseValue: number | null;
  unit: string;
  calculatedVolume: number | null;
  syringeType?: 'Insulin' | 'Standard' | null;
  recommendedMarking?: string | null;
  injectionSite?: InjectionSite | null;
  
  // Original user inputs for "Use Last Dose" feature
  medicationInputType?: 'concentration' | 'totalAmount' | null;
  concentrationAmount?: string;
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: string;
  solutionVolume?: string;
}