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
      let profileData: UserProfile | null = null;

      // First try to load from Firebase if user is available
      if (user?.uid) {
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            profileData = docSnap.data() as UserProfile;
            console.log('User profile loaded from Firebase');
            
            // Also update local storage as cache
            await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profileData));
          }
        } catch (firebaseError) {
          console.warn('Error loading profile from Firebase, falling back to local storage:', firebaseError);
        }
      }

      // Fallback to local storage if Firebase failed or user not available
      if (!profileData) {
        const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
        if (storedProfile) {
          profileData = JSON.parse(storedProfile);
          console.log('User profile loaded from local storage');
        }
      }

      setProfile(profileData);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
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