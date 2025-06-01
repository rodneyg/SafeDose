import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile from storage on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  };

  const clearProfile = async () => {
    try {
      await AsyncStorage.removeItem(USER_PROFILE_STORAGE_KEY);
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