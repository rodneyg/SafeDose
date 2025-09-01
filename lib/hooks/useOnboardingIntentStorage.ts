import { useCallback } from 'react';
import { collection } from 'firebase/firestore';
import { addDocWithEnv } from '@/lib/firestoreWithEnv';
import { db } from '@/lib/firebase';
import { UserProfileAnswers } from '@/types/userProfile';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface OnboardingIntentData {
  timestamp: string;
  isLicensedProfessional: boolean;
  isProfessionalAthlete: boolean;
  isPersonalUse: boolean;
  isCosmeticUse: boolean;
  user_segment: string;
  device_id?: string;
}

// Function to determine user segment based on answers
const getUserSegment = (answers: {
  isLicensedProfessional: boolean;
  isProfessionalAthlete: boolean;
  isPersonalUse: boolean;
  isCosmeticUse: boolean;
}): string => {
  if (answers.isLicensedProfessional) {
    return 'healthcare_professional';
  }
  
  if (answers.isProfessionalAthlete) {
    return 'professional_athlete';
  }
  
  if (answers.isCosmeticUse) {
    return 'cosmetic_user';
  }
  
  if (answers.isPersonalUse) {
    return 'personal_medical_user';
  }
  
  return 'general_user';
};

// Function to generate a simple device/session identifier
const generateDeviceId = (): string => {
  return 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export function useOnboardingIntentStorage() {
  // Submit onboarding intent data to Firestore
  const submitOnboardingIntent = useCallback(async (answers: UserProfileAnswers): Promise<void> => {
    try {
      // Convert answers to concrete boolean values (handle null cases)
      const intentData: OnboardingIntentData = {
        timestamp: new Date().toISOString(),
        isLicensedProfessional: answers.isLicensedProfessional ?? false,
        isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
        isPersonalUse: answers.isPersonalUse ?? true, // Default to personal use if skipped
        isCosmeticUse: answers.isCosmeticUse ?? false,
        user_segment: getUserSegment({
          isLicensedProfessional: answers.isLicensedProfessional ?? false,
          isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
          isPersonalUse: answers.isPersonalUse ?? true,
          isCosmeticUse: answers.isCosmeticUse ?? false,
        }),
        device_id: generateDeviceId(),
      };

      console.log('[OnboardingIntent] Submitting intent data:', intentData);

      // Save to Firestore (no authentication required)
      const onboardingIntentCollection = collection(db, 'onboarding_intent_submissions');
      const docRef = await addDocWithEnv(onboardingIntentCollection, intentData);
      
      console.log('[OnboardingIntent] ✅ Intent data saved to Firestore with ID:', docRef.id);

      // Save to local storage as backup
      try {
        const storageKey = 'onboarding_intent_backup';
        const existingIntents = await AsyncStorage.getItem(storageKey);
        const intentList: OnboardingIntentData[] = existingIntents ? JSON.parse(existingIntents) : [];
        
        intentList.push(intentData);
        
        // Keep only the last 10 intent submissions to prevent storage bloat
        if (intentList.length > 10) {
          intentList.splice(0, intentList.length - 10);
        }
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(intentList));
        console.log('[OnboardingIntent] ✅ Intent data backed up to local storage');
      } catch (localError) {
        console.warn('[OnboardingIntent] ⚠️ Failed to backup intent data locally:', localError);
        // Don't throw - Firestore save was successful
      }
    } catch (error) {
      console.error('[OnboardingIntent] ❌ Failed to submit intent data:', error);
      
      // Try to save to local storage as fallback
      try {
        const fallbackData: OnboardingIntentData = {
          timestamp: new Date().toISOString(),
          isLicensedProfessional: answers.isLicensedProfessional ?? false,
          isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
          isPersonalUse: answers.isPersonalUse ?? true,
          isCosmeticUse: answers.isCosmeticUse ?? false,
          user_segment: getUserSegment({
            isLicensedProfessional: answers.isLicensedProfessional ?? false,
            isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
            isPersonalUse: answers.isPersonalUse ?? true,
            isCosmeticUse: answers.isCosmeticUse ?? false,
          }),
          device_id: generateDeviceId(),
        };

        const storageKey = 'onboarding_intent_fallback';
        const existingFallbacks = await AsyncStorage.getItem(storageKey);
        const fallbackList: OnboardingIntentData[] = existingFallbacks ? JSON.parse(existingFallbacks) : [];
        
        fallbackList.push(fallbackData);
        
        // Keep only the last 5 fallback submissions
        if (fallbackList.length > 5) {
          fallbackList.splice(0, fallbackList.length - 5);
        }
        
        await AsyncStorage.setItem(storageKey, JSON.stringify(fallbackList));
        console.log('[OnboardingIntent] ✅ Intent data saved to local fallback storage');
      } catch (fallbackError) {
        console.error('[OnboardingIntent] ❌ Failed to save intent data to fallback storage:', fallbackError);
        // At this point, we've exhausted all options, but don't throw to avoid breaking onboarding
        console.warn('[OnboardingIntent] ⚠️ Intent data collection failed completely, but continuing onboarding');
      }
    }
  }, []);

  return {
    submitOnboardingIntent,
  };
}