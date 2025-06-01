export interface UserProfile {
  isLicensedProfessional: boolean;
  isPersonalUse: boolean;
  isCosmeticUse: boolean;
  dateCreated: string;
  userId?: string; // Optional field to track which user this profile belongs to
}

export type UserProfileAnswers = {
  isLicensedProfessional: boolean | null;
  isPersonalUse: boolean | null;
  isCosmeticUse: boolean | null;
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
  
  // Personal, prescribed use gets moderate warnings
  if (profile.isPersonalUse && !profile.isCosmeticUse) {
    return WarningLevel.MODERATE;
  }
  
  // All other cases (non-professional, cosmetic use, etc.) get strict warnings
  return WarningLevel.STRICT;
};

export const getDisclaimerText = (profile: UserProfile): string => {
  const warningLevel = getUserWarningLevel(profile);
  
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