import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, WarningLevel, getUserWarningLevel, getDisclaimerText } from '@/types/userProfile';

interface UserProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  warningLevel: WarningLevel;
  disclaimerText: string;
  saveProfile: (profile: UserProfile) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const USER_PROFILE_STORAGE_KEY = 'userProfile';

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from storage on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      console.log('[UserProfile] ========== LOADING PROFILE START ==========');
      console.log('[UserProfile] User state:', {
        userId: user?.uid || 'No user',
        isAnonymous: user?.isAnonymous || 'No user',
        userType: user ? (user.isAnonymous ? 'anonymous' : 'authenticated') : 'none'
      });
      
      let profileData: UserProfile | null = null;
      let dataSource = 'none';

      // For anonymous users, prioritize local storage (they shouldn't have Firebase access)
      if (user?.isAnonymous) {
        console.log('[UserProfile] Anonymous user detected - prioritizing local storage');
        try {
          const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
          if (storedProfile) {
            profileData = JSON.parse(storedProfile);
            dataSource = 'local_storage_anonymous';
            console.log('[UserProfile] ✅ Profile loaded from local storage (anonymous user):', profileData);
          } else {
            console.log('[UserProfile] No local profile found for anonymous user');
          }
        } catch (localError) {
          console.error('[UserProfile] ❌ Failed to load from local storage for anonymous user:', localError);
        }
      } else if (user?.uid) {
        // For authenticated users, try Firebase first, then local storage fallback
        console.log('[UserProfile] Authenticated user detected - trying Firebase first');
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            profileData = docSnap.data() as UserProfile;
            dataSource = 'firebase';
            console.log('[UserProfile] ✅ Profile loaded from Firebase:', profileData);
            
            // Also update local storage as cache
            await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profileData));
            console.log('[UserProfile] Profile cached to local storage');
          } else {
            console.log('[UserProfile] No profile document found in Firebase');
          }
        } catch (firebaseError) {
          console.warn('[UserProfile] ⚠️ Firebase load failed, falling back to local storage:', firebaseError);
        }

        // Fallback to local storage if Firebase failed
        if (!profileData) {
          try {
            const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
            if (storedProfile) {
              profileData = JSON.parse(storedProfile);
              dataSource = 'local_storage_fallback';
              console.log('[UserProfile] ✅ Profile loaded from local storage (fallback):', profileData);
            } else {
              console.log('[UserProfile] No local profile found either');
            }
          } catch (localError) {
            console.error('[UserProfile] ❌ Local storage fallback also failed:', localError);
          }
        }
      } else {
        console.log('[UserProfile] No user available - checking local storage only');
        try {
          const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
          if (storedProfile) {
            profileData = JSON.parse(storedProfile);
            dataSource = 'local_storage_no_user';
            console.log('[UserProfile] ✅ Profile loaded from local storage (no user):', profileData);
          }
        } catch (localError) {
          console.error('[UserProfile] ❌ Failed to load from local storage (no user):', localError);
        }
      }

      console.log('[UserProfile] Final profile data:', {
        found: !!profileData,
        source: dataSource,
        profileSummary: profileData ? {
          isLicensedProfessional: profileData.isLicensedProfessional,
          isPersonalUse: profileData.isPersonalUse,
          isCosmeticUse: profileData.isCosmeticUse,
          dateCreated: profileData.dateCreated
        } : null
      });

      setProfile(profileData);
      console.log('[UserProfile] ========== LOADING PROFILE COMPLETE ==========');
    } catch (error) {
      console.error('[UserProfile] ❌ CRITICAL ERROR loading user profile:', error);
      console.error('[UserProfile] Error stack:', error instanceof Error ? error.stack : 'No stack');
    } finally {
      setIsLoading(false);
      console.log('[UserProfile] Loading state set to false');
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      // Save to local storage first (as cache/fallback)
      await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      
      // Save to Firebase if user is available
      if (user?.uid) {
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          await setDoc(docRef, newProfile);
          console.log('User profile saved to Firebase');
        } catch (firebaseError) {
          console.warn('Error saving profile to Firebase, but local storage succeeded:', firebaseError);
          // Don't throw here - local storage save was successful
        }
      } else {
        console.log('User not available, profile saved to local storage only');
      }
      
      setProfile(newProfile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  };

  const clearProfile = async () => {
    try {
      // Clear from local storage
      await AsyncStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      
      // Clear from Firebase if user is available
      if (user?.uid) {
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          await setDoc(docRef, {}, { merge: false }); // Effectively deletes the document
          console.log('User profile cleared from Firebase');
        } catch (firebaseError) {
          console.warn('Error clearing profile from Firebase:', firebaseError);
        }
      }
      
      setProfile(null);
    } catch (error) {
      console.error('Error clearing user profile:', error);
      throw error;
    }
  };

  // Calculate warning level and disclaimer text based on current profile
  const warningLevel = profile ? getUserWarningLevel(profile) : WarningLevel.STRICT;
  const disclaimerText = profile ? getDisclaimerText(profile) : 'Always consult a licensed healthcare professional before administering any medication.';

  return (
    <UserProfileContext.Provider 
      value={{
        profile,
        isLoading,
        warningLevel,
        disclaimerText,
        saveProfile,
        clearProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}