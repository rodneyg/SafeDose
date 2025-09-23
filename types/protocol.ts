export interface Protocol {
  id: string;
  name: string;
  medication: string;
  dosage: string;
  unit: 'mg' | 'mL' | 'IU' | 'mcg';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  customFrequencyDays?: number;
  startDate: string; // ISO 8601 date
  isActive: boolean;
  dateCreated: string;
  userId?: string;
}

export type ProtocolType = 'trt' | 'peptides' | 'insulin' | 'custom';

export interface ProtocolTemplate {
  type: ProtocolType;
  name: string;
  description: string;
  commonMedications: string[];
  defaultUnits: ('mg' | 'mL' | 'IU' | 'mcg')[];
  commonFrequencies: ('daily' | 'weekly' | 'biweekly' | 'monthly')[];
}

export const PROTOCOL_TEMPLATES: ProtocolTemplate[] = [
  {
    type: 'trt',
    name: 'Testosterone Replacement Therapy (TRT)',
    description: 'Hormone replacement therapy for testosterone deficiency',
    commonMedications: ['Testosterone Cypionate', 'Testosterone Enanthate', 'Testosterone Propionate'],
    defaultUnits: ['mg', 'mL'],
    commonFrequencies: ['weekly', 'biweekly']
  },
  {
    type: 'peptides',
    name: 'Peptides',
    description: 'Peptide therapy for various health and wellness goals',
    commonMedications: ['Semaglutide', 'Tirzepatide', 'BPC-157', 'TB-500', 'Ipamorelin'],
    defaultUnits: ['mg', 'mcg', 'IU'],
    commonFrequencies: ['daily', 'weekly']
  },
  {
    type: 'insulin',
    name: 'Insulin',
    description: 'Insulin therapy for diabetes management',
    commonMedications: ['Insulin Glargine', 'Insulin Lispro', 'Insulin Aspart', 'Insulin NPH'],
    defaultUnits: ['IU', 'mL'],
    commonFrequencies: ['daily']
  },
  {
    type: 'custom',
    name: 'Custom Protocol',
    description: 'Create your own custom medication protocol',
    commonMedications: [],
    defaultUnits: ['mg', 'mL', 'IU', 'mcg'],
    commonFrequencies: ['daily', 'weekly', 'biweekly', 'monthly']
  }
];

export interface ProtocolScheduleEntry {
  id: string;
  protocolId: string;
  scheduledDate: string; // ISO 8601 date
  isCompleted: boolean;
  completedDate?: string;
  actualDose?: string;
  notes?: string;
}