/**
 * SafeDose Encryption & Compliance Module
 * Exports all encryption, Firebase, and API components
 */

export { 
  SafeDoseEncryption, 
  safeDoseEncryption,
  EncryptedData,
  EducationalCalculation,
  PersonalCalculation,
  SafeDoseCalculation 
} from './safeDoseEncryption';

export { 
  SafeDoseFirebaseService, 
  safeDoseFirebaseService,
  StoredCalculation,
  AuditLogEntry 
} from './safeDoseFirebaseService';

export { 
  SafeDoseAPI, 
  safeDoseAPI,
  DoseCalculationParams,
  CalculationResult,
  UserMode,
  ComplianceStatus 
} from './safeDoseAPI';

// Type guards for safer type checking
export const isEducationalCalculation = (
  calc: SafeDoseCalculation
): calc is EducationalCalculation => {
  return calc.isEducational === true;
};

export const isPersonalCalculation = (
  calc: SafeDoseCalculation
): calc is PersonalCalculation => {
  return calc.isEducational === false;
};

// Utility functions
export const getCalculationTypeLabel = (calc: SafeDoseCalculation): string => {
  return calc.isEducational ? 'Educational' : 'Personal';
};

export const isCalculationEncrypted = (calc: SafeDoseCalculation): boolean => {
  return !calc.isEducational;
};

// Constants
export const ENCRYPTION_VERSION = '1.0.0';
export const SUPPORTED_ALGORITHMS = ['AES-GCM'] as const;
export const MAX_LOCAL_CALCULATIONS = 100;
export const COMPLIANCE_REVERIFICATION_DAYS = 30;