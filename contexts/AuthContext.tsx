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
    console.log('[AuthContext] ========== LOGOUT INITIATED ==========');
    console.log('[AuthContext] Current user before logout:', user ? {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email
    } : 'No user');
    console.log('[AuthContext] Current isSigningOut state before logout:', isSigningOut);
    
    try {
      console.log('[AuthContext] Setting isSigningOut to true...');
      setIsSigningOut(true);
      console.log('[AuthContext] isSigningOut state updated to true');
      
      console.log('[AuthContext] Calling Firebase signOut...');
      await signOut(auth);
      console.log('[AuthContext] Firebase signOut completed successfully');
      
      console.log('[AuthContext] Logging analytics event...');
      logAnalyticsEvent(ANALYTICS_EVENTS.LOGOUT);
      console.log('[AuthContext] Analytics event logged successfully');
      
      console.log('[AuthContext] ✅ Signed out successfully - logout function complete');
    } catch (error) {
      console.error('[AuthContext] ❌ Error signing out:', error);
      console.error('[AuthContext] Error details:', {
        message: error?.message || 'Unknown error',
        code: error?.code || 'No error code',
        name: error?.name || 'Unknown error type'
      });
      console.log('[AuthContext] Resetting isSigningOut to false due to error');
      setIsSigningOut(false);
      throw error;
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Subscribe to auth state changes on the single `auth` instance
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] ========== AUTH STATE CHANGED ==========');
      console.log('[AuthContext] New user state:', firebaseUser ? {
        uid: firebaseUser.uid,
        isAnonymous: firebaseUser.isAnonymous,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      } : 'null');
      console.log('[AuthContext] Current isSigningOut state:', isSigningOut);
      console.log('[AuthContext] Previous user state:', user ? {
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        email: user.email,
        displayName: user.displayName
      } : 'null');
      
      if (firebaseUser) {
        console.log('[AuthContext] User found - setting user and clearing sign out state');
        setUser(firebaseUser);
        console.log('[AuthContext] User state updated to new user');
        setIsSigningOut(false);
        console.log('[AuthContext] isSigningOut state cleared');
        
        // Clear any pending timeout if user signs in
        if (timeoutId) {
          console.log('[AuthContext] Clearing pending timeout - user signed in');
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        // Set user properties for analytics
        setAnalyticsUserProperties({
          [USER_PROPERTIES.IS_ANONYMOUS]: firebaseUser.isAnonymous,
          // Note: plan_type will be set when we have user plan data
        });
        console.log('[AuthContext] Analytics user properties set');
      } else {
        console.log('[AuthContext] No user found - setting user to null');
        setUser(null);
        console.log('[AuthContext] User state set to null');
        
        // If we're not in the middle of signing out, automatically sign in anonymously
        if (!isSigningOut) {
          console.log('[AuthContext] Not signing out - signing in anonymously immediately');
          signInAnonymously(auth)
            .then(() => {
              console.log('[AuthContext] ✅ Signed in anonymously successfully');
            })
            .catch((error) => {
              console.error('[AuthContext] ❌ Error signing in anonymously:', error);
              console.error('[AuthContext] Anonymous sign-in error details:', {
                message: error?.message || 'Unknown error',
                code: error?.code || 'No error code'
              });
            });
        } else {
          console.log('[AuthContext] Currently signing out - will sign in anonymously after 2 second delay');
          // User has completed sign out, wait a moment to show they're signed out
          // then sign them back in anonymously for app continuity
          timeoutId = setTimeout(() => {
            console.log('[AuthContext] Timeout reached - resetting sign out state and signing in anonymously');
            setIsSigningOut(false);
            signInAnonymously(auth)
              .then(() => {
                console.log('[AuthContext] ✅ Signed in anonymously after logout');
              })
              .catch((error) => {
                console.error('[AuthContext] ❌ Error signing in anonymously after logout:', error);
                console.error('[AuthContext] Post-logout anonymous sign-in error details:', {
                  message: error?.message || 'Unknown error',
                  code: error?.code || 'No error code'
                });
              });
          }, 2000); // 2 second delay to show the sign out actually happened
        }
      }
      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
      console.log('[AuthContext] ========== AUTH STATE CHANGE COMPLETE ==========');
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