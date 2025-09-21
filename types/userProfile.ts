export interface UserProfile {
  isLicensedProfessional: boolean;
  isProfessionalAthlete: boolean;
  isPersonalUse: boolean;
  isCosmeticUse: boolean;
  isPerformanceUse: boolean;
  isRecoveryUse: boolean;
  age?: number; // Age of the user for safety and personalization (calculated from birthDate)
  birthDate?: string; // Birth date in YYYY-MM-DD format for more precise age calculation
  dateCreated: string;
  userId?: string; // Optional field to track which user this profile belongs to
  followsProtocol: boolean; // Whether user follows a structured medication protocol
  hasSetupProtocol?: boolean; // Whether user has completed protocol setup
}

export type UserProfileAnswers = {
  isLicensedProfessional: boolean | null;
  isProfessionalAthlete: boolean | null;
  isPersonalUse: boolean | null;
  isCosmeticUse: boolean | null;
  isPerformanceUse: boolean | null;
  isRecoveryUse: boolean | null;
  age: number | null;
  birthDate: string | null; // Birth date in YYYY-MM-DD format
  followsProtocol: boolean | null; // Whether user follows a structured medication protocol
};

export enum WarningLevel {
  STRICT = 'strict',
  MODERATE = 'moderate',
  MINIMAL = 'minimal'
}

export const getUserWarningLevel = (profile: UserProfile): WarningLevel => {
  // Licensed professionals get minimal warnings
  if (profile.isLicensedProfessional) {
    return WarningLevel.MINIMAL;
  }
  
  // Professional athletes get moderate warnings
  if (profile.isProfessionalAthlete) {
    return WarningLevel.MODERATE;
  }
  
  // Performance use gets moderate warnings
  if (profile.isPerformanceUse) {
    return WarningLevel.MODERATE;
  }
  
  // Recovery use gets moderate warnings
  if (profile.isRecoveryUse) {
    return WarningLevel.MODERATE;
  }
  
  // Personal, prescribed use gets moderate warnings
  if (profile.isPersonalUse && !profile.isCosmeticUse) {
    return WarningLevel.MODERATE;
  }
  
  // All other cases (non-professional, cosmetic use, etc.) get strict warnings
  return WarningLevel.STRICT;
};

export const getDisclaimerText = (profile: UserProfile): string => {
  const warningLevel = getUserWarningLevel(profile);
  
  // Check for specific user types first
  if (profile.isLicensedProfessional) {
    return "Professional use: Verify calculations independently for patient safety.";
  }
  
  if (profile.isProfessionalAthlete) {
    return "Professional athlete use: Double-check calculations and consult with your sports medicine team or healthcare provider.";
  }
  
  if (profile.isPerformanceUse) {
    return "Performance use: Double-check calculations and consult with a healthcare provider familiar with performance enhancement protocols.";
  }
  
  if (profile.isRecoveryUse) {
    return "Recovery use: Double-check calculations and consult with a healthcare provider familiar with recovery and injury healing protocols.";
  }
  
  switch (warningLevel) {
    case WarningLevel.MINIMAL:
      return "Professional use: Verify calculations independently for patient safety.";
    case WarningLevel.MODERATE:
      return "Personal use: Double-check calculations and consult your healthcare provider.";
    case WarningLevel.STRICT:
      return "**Critical**: This information is for educational purposes only. Always consult a licensed healthcare professional before administering any medication.";
    default:
      return "Always consult a licensed healthcare professional before administering any medication.";
  }
};