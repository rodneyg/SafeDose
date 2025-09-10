/**
 * SafeDose Encryption & Compliance Module
 * Exports all encryption, Firebase, and API components including abstract SafeAPI
 */

// Export abstract SafeAPI and concrete implementation
export { 
  SafeAPI, 
  PGPSafeAPI, 
  safeAPI,
  SecureData,
  UserContext,
  EncryptionConfig,
  StorageConfig,
  ComplianceConfig
} from './safeAPI';

// Export SafeDose-specific API that uses SafeAPI
export { 
  SafeDoseAPI, 
  safeDoseAPI,
  DoseCalculationParams,
  CalculationResult,
  UserMode,
  ComplianceStatus,
  SafeDoseCalculation 
} from './safeDoseAPI';

// Legacy exports for backward compatibility
export { 
  SafeDoseEncryption, 
  safeDoseEncryption,
  EncryptedData,
  EducationalCalculation,
  PersonalCalculation
} from './safeDoseEncryption';

export { 
  SafeDoseFirebaseService, 
  safeDoseFirebaseService,
  StoredCalculation,
  AuditLogEntry 
} from './safeDoseFirebaseService';

// Type guards for safer type checking
export const isEducationalCalculation = (
  calc: SafeDoseCalculation
): boolean => {
  return calc.dataType === 'educational_calculation';
};

export const isPersonalCalculation = (
  calc: SafeDoseCalculation
): boolean => {
  return calc.dataType === 'personal_calculation';
};

// Utility functions
export const getCalculationTypeLabel = (calc: SafeDoseCalculation): string => {
  return calc.dataType === 'educational_calculation' ? 'Educational' : 'Personal';
};

export const isCalculationEncrypted = (calc: SafeDoseCalculation): boolean => {
  return calc.isEncrypted;
};

export const hasSuccessfulOutcomes = (calc: SafeDoseCalculation): boolean => {
  return calc.successMetrics?.educationalGoalMet || false;
};

// Constants
export const ENCRYPTION_VERSION = '1.0.0';
export const SUPPORTED_ALGORITHMS = ['AES-GCM', 'PGP'] as const;
export const MAX_LOCAL_CALCULATIONS = 100;
export const COMPLIANCE_REVERIFICATION_DAYS = 30;

// Focus area constants for successful outcomes
export const FOCUS_AREAS = {
  DOSAGE_ACCURACY: 'dosageAccuracy',
  EDUCATIONAL_RESOURCES: 'educationalResources', 
  ADHERENCE_TRACKING: 'adherenceTracking',
  SCHEDULE_MANAGEMENT: 'scheduleManagement'
} as const;

// Legal compliance constants
export const LEGAL_STANDARDS = {
  DATA_PROTECTION: 'dataProtection',
  INFORMED_CONSENT: 'informedConsent', 
  DISCLAIMER_COMPLIANCE: 'disclaimerCompliance',
  AUDIT_TRAIL_MAINTAINED: 'auditTrailMaintained'
} as const;