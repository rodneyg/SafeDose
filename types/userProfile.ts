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
  
  // Educational-first disclaimers to avoid medical device classification
  const baseEducationalText = "This is an educational calculation tool only. All results must be independently verified by qualified professionals. SafeDose is not intended for direct medical use and should not replace professional medical judgment.";
  
  // Check for specific user types first
  if (profile.isLicensedProfessional) {
    return `${baseEducationalText} Professional note: Always verify calculations independently and follow your professional protocols.`;
  }
  
  if (profile.isProfessionalAthlete) {
    return `${baseEducationalText} Athletic note: Consult with your sports medicine team before using any compounds.`;
  }
  
  if (profile.isPerformanceUse) {
    return `${baseEducationalText} Performance note: Educational calculations should be reviewed with qualified professionals familiar with your specific protocols.`;
  }
  
  if (profile.isRecoveryUse) {
    return `${baseEducationalText} Recovery note: Educational calculations should be reviewed with qualified professionals familiar with recovery protocols.`;
  }
  
  switch (warningLevel) {
    case WarningLevel.MINIMAL:
      return `${baseEducationalText} Professional note: Always verify calculations independently and follow your professional protocols.`;
    case WarningLevel.MODERATE:
      return `${baseEducationalText} Personal note: This educational tool should supplement, not replace, professional guidance.`;
    case WarningLevel.STRICT:
      return `${baseEducationalText} **Important**: This is strictly for educational and informational purposes. Always consult qualified professionals before using any compounds.`;
    default:
      return `${baseEducationalText} Always consult qualified professionals before using any compounds.`;
  }
};