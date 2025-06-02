import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User, Auth } from 'firebase/auth';
import { ActivityIndicator } from 'react-native';
import { auth } from '@/lib/firebase'; // Initialized auth instance
import { logAnalyticsEvent, setAnalyticsUserProperties, ANALYTICS_EVENTS, USER_PROPERTIES } from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  auth: Auth;
  logout: () => Promise<void>;
  isSigningOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const logout = async () => {
    try {
      setIsSigningOut(true);
      await signOut(auth);
      logAnalyticsEvent(ANALYTICS_EVENTS.LOGOUT);
      console.log('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
      throw error;
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Subscribe to auth state changes on the single `auth` instance
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsSigningOut(false);
        
        // Clear any pending timeout if user signs in
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Set user properties for analytics
        setAnalyticsUserProperties({
          [USER_PROPERTIES.IS_ANONYMOUS]: firebaseUser.isAnonymous,
          // Note: plan_type will be set when we have user plan data
        });
      } else {
        setUser(null);
        // If we're not in the middle of signing out, automatically sign in anonymously
        if (!isSigningOut) {
          signInAnonymously(auth)
            .then(() => console.log('Signed in anonymously successfully'))
            .catch((error) => console.error('Error signing in anonymously:', error));
        } else {
          // User has completed sign out, wait a moment to show they're signed out
          // then sign them back in anonymously for app continuity
          timeoutId = setTimeout(() => {
            setIsSigningOut(false);
            signInAnonymously(auth)
              .then(() => console.log('Signed in anonymously after logout'))
              .catch((error) => console.error('Error signing in anonymously after logout:', error));
          }, 2000); // 2 second delay to show the sign out actually happened
        }
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isSigningOut]);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <AuthContext.Provider value={{ user, auth, logout, isSigningOut }}>
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