import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User, Auth } from 'firebase/auth';
import { ActivityIndicator } from 'react-native';
import { auth } from '@/lib/firebase'; // Initialized auth instance
import { logAnalyticsEvent, setAnalyticsUserProperties, ANALYTICS_EVENTS, USER_PROPERTIES } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  auth: Auth;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
      logAnalyticsEvent(ANALYTICS_EVENTS.LOGOUT);
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes on the single `auth` instance
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Set user properties for analytics
        setAnalyticsUserProperties({
          [USER_PROPERTIES.IS_ANONYMOUS]: firebaseUser.isAnonymous,
          // Note: plan_type will be set when we have user plan data
        });
      } else {
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
    <AuthContext.Provider value={{ user, auth, logout }}>
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