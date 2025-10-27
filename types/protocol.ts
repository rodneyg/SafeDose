export type FrequencyType = '1x-week' | '2x-week' | '3x-week' | 'daily';
export type ConcentrationUnit = 'mg/mL' | 'IU/mL' | 'mcg/mL' | 'units/mL';

export interface ProtocolSchedule {
  id: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  time: string; // HH:MM format
  doseAmount: number; // Amount per dose
  unit: string; // mg, IU, mcg, etc.
}

export interface DosingProtocol {
  id: string;
  compoundName: string;
  concentration: number;
  concentrationUnit: ConcentrationUnit;
  weeklyTargetDose: number;
  weeklyTargetUnit: string; // mg, IU, mcg, etc.
  frequency: FrequencyType;
  startDate: string; // ISO date string
  startTime: string; // HH:MM format
  schedule: ProtocolSchedule[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface CalculatedDose {
  amountPerDose: number; // e.g., 75 mg
  volumePerDose: number; // e.g., 0.25 mL
  syringeUnits: number; // e.g., 25 units on 1mL syringe
  syringeType: '1mL' | '3mL' | '5mL' | '10mL';
}

export interface NextDose {
  scheduleId: string;
  nextDateTime: string; // ISO datetime string
  doseInfo: CalculatedDose;
  compoundName: string;
}

export interface ProtocolPreview {
  protocol: DosingProtocol;
  upcomingDoses: NextDose[];
  calculatedDose: CalculatedDose;
}

// Frequency calculation helpers
export const FREQUENCY_CONFIG = {
  '1x-week': { 
    dosesPerWeek: 1, 
    daysBetween: 7,
    description: 'Once weekly'
  },
  '2x-week': { 
    dosesPerWeek: 2, 
    daysBetween: 3.5,
    description: 'Twice weekly'
  },
  '3x-week': { 
    dosesPerWeek: 3, 
    daysBetween: 2.33,
    description: 'Three times weekly'
  },
  'daily': { 
    dosesPerWeek: 7, 
    daysBetween: 1,
    description: 'Daily'
  }
} as const;