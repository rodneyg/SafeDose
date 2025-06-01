import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User, Auth } from 'firebase/auth';
import { ActivityIndicator } from 'react-native';
import { auth, db } from '@/lib/firebase'; // Initialized auth instance and db
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { logAnalyticsEvent, setAnalyticsUserProperties, ANALYTICS_EVENTS, USER_PROPERTIES } from '@/lib/analytics';

// Define UserProfile interface
export interface UserProfile {
  isHealthProfessional: boolean;
  isPersonalUse: boolean;
  useType: 'Cosmetic' | 'Prescribed'; // Updated to match questionnaire values
}

interface AuthContextType {
  user: User | null;
  auth: Auth;
  userProfile: UserProfile | null;
  updateUserProfile: (profile: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserProfile = async (profile: UserProfile) => {
    if (user) {
      try {
        const profileRef = doc(db, 'userProfiles', user.uid);
        await setDoc(profileRef, profile, { merge: true }); // Use merge to avoid overwriting other fields if any
        setUserProfile(profile);
        logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_UPDATE, profile);
        console.log('User profile updated successfully');
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    } else {
      throw new Error('User not authenticated to update profile');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null); // Clear user profile on logout
      logAnalyticsEvent(ANALYTICS_EVENTS.LOGOUT);
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Load user profile from Firestore
        const profileRef = doc(db, 'userProfiles', firebaseUser.uid);
        try {
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data() as UserProfile);
            setAnalyticsUserProperties({
              [USER_PROPERTIES.HAS_PROFILE]: true,
            });
          } else {
            setUserProfile(null);
            setAnalyticsUserProperties({
              [USER_PROPERTIES.HAS_PROFILE]: false,
            });
            console.log('No user profile found for user:', firebaseUser.uid);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          setUserProfile(null); // Ensure profile is null on error
        }

        setAnalyticsUserProperties({
          [USER_PROPERTIES.IS_ANONYMOUS]: firebaseUser.isAnonymous,
        });
      } else {
        setUser(null); // Clear user on sign out
        setUserProfile(null); // Clear profile on sign out
        // Automatically sign in anonymously if there's no user
        signInAnonymously(auth)
          .then(() => console.log('Signed in anonymously successfully'))
          .catch((error) => console.error('Error signing in anonymously:', error));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <AuthContext.Provider value={{ user, auth, userProfile, updateUserProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}