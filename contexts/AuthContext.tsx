import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User, Auth } from 'firebase/auth';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const isSigningOutRef = useRef(false);
  const isSigningInAnonymouslyRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      isSigningOutRef.current = true;
      console.log('[AuthContext] isSigningOut state and ref updated to true');
      
      // Set a fallback timeout to prevent being stuck in signing out state
      fallbackTimeoutRef.current = setTimeout(() => {
        console.log('[AuthContext] ⚠️ Fallback timeout reached - forcing sign out state reset');
        setIsSigningOut(false);
        isSigningOutRef.current = false;
        fallbackTimeoutRef.current = null;
        // Try to sign in anonymously as a fallback
        if (!isSigningInAnonymouslyRef.current) {
          isSigningInAnonymouslyRef.current = true;
          signInAnonymously(auth)
            .then(() => {
              console.log('[AuthContext] ✅ Fallback anonymous sign-in successful');
              isSigningInAnonymouslyRef.current = false;
            })
            .catch((error) => {
              console.error('[AuthContext] ❌ Fallback anonymous sign-in failed:', error);
              isSigningInAnonymouslyRef.current = false;
            });
        }
      }, 10000); // 10 second fallback timeout
      
      console.log('[AuthContext] Calling Firebase signOut...');
      await signOut(auth);
      console.log('[AuthContext] Firebase signOut completed successfully');
      
      console.log('[AuthContext] Clearing user state...');
      setUser(null);
      console.log('[AuthContext] User state cleared');
      
      console.log('[AuthContext] Clearing cached data...');
      try {
        // Clear any cached user data from local storage (web)
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove = ['userProfile', 'usage', 'preferences'];
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`[AuthContext] Cleared localStorage key: ${key}`);
          });
        }
        
        // Clear any cached user data from AsyncStorage (React Native)
        const asyncKeysToRemove = ['userProfile', 'usage', 'preferences', 'onboardingComplete'];
        await Promise.all(
          asyncKeysToRemove.map(async (key) => {
            try {
              await AsyncStorage.removeItem(key);
              console.log(`[AuthContext] Cleared AsyncStorage key: ${key}`);
            } catch (error) {
              console.warn(`[AuthContext] Error clearing AsyncStorage key ${key}:`, error);
            }
          })
        );
      } catch (storageError) {
        console.warn('[AuthContext] Error clearing cached data:', storageError);
      }
      console.log('[AuthContext] Cached data cleared');
      
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
      isSigningOutRef.current = false;
      
      // Clear fallback timeout on error
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      
      throw error;
    }
  };

  // Sync ref with state to ensure consistency
  useEffect(() => {
    isSigningOutRef.current = isSigningOut;
  }, [isSigningOut]);

  useEffect(() => {
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
      console.log('[AuthContext] Current isSigningOut ref:', isSigningOutRef.current);
      console.log('[AuthContext] Previous user state:', user ? {
        uid: user.uid,
        isAnonymous: user.isAnonymous,
        email: user.email,
        displayName: user.displayName
      } : 'null');
      
      // Only clear timeouts when user becomes authenticated, not when becoming null during logout
      if (firebaseUser) {
        // Clear timeouts when user signs in successfully
        if (timeoutRef.current) {
          console.log('[AuthContext] Clearing logout timeout - user signed in successfully');
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        if (fallbackTimeoutRef.current) {
          console.log('[AuthContext] Clearing fallback timeout - user signed in successfully');
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
      }
      
      if (firebaseUser) {
        console.log('[AuthContext] User found - setting user and clearing sign out state');
        setUser(firebaseUser);
        console.log('[AuthContext] User state updated to new user');
        setIsSigningOut(false);
        isSigningOutRef.current = false;
        isSigningInAnonymouslyRef.current = false; // Reset anonymous sign-in flag when user is authenticated
        console.log('[AuthContext] isSigningOut state and ref cleared');
        
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
        if (!isSigningOutRef.current && !isSigningInAnonymouslyRef.current) {
          console.log('[AuthContext] Not signing out and not already signing in anonymously - signing in anonymously immediately');
          isSigningInAnonymouslyRef.current = true;
          signInAnonymously(auth)
            .then(() => {
              console.log('[AuthContext] ✅ Signed in anonymously successfully');
              isSigningInAnonymouslyRef.current = false;
            })
            .catch((error) => {
              console.error('[AuthContext] ❌ Error signing in anonymously:', error);
              console.error('[AuthContext] Anonymous sign-in error details:', {
                message: error?.message || 'Unknown error',
                code: error?.code || 'No error code'
              });
              isSigningInAnonymouslyRef.current = false;
            });
        } else if (isSigningInAnonymouslyRef.current) {
          console.log('[AuthContext] Anonymous sign-in already in progress - skipping duplicate attempt');
        } else {
          console.log('[AuthContext] Currently signing out - will sign in anonymously after 2 second delay');
          // Only set timeout if one isn't already set for logout
          if (!timeoutRef.current) {
            console.log('[AuthContext] Setting 2-second logout timeout');
            timeoutRef.current = setTimeout(() => {
              console.log('[AuthContext] Timeout reached - resetting sign out state and signing in anonymously');
              setIsSigningOut(false);
              isSigningOutRef.current = false;
              if (!isSigningInAnonymouslyRef.current) {
                isSigningInAnonymouslyRef.current = true;
                signInAnonymously(auth)
                  .then(() => {
                    console.log('[AuthContext] ✅ Signed in anonymously after logout');
                    isSigningInAnonymouslyRef.current = false;
                  })
                  .catch((error) => {
                    console.error('[AuthContext] ❌ Error signing in anonymously after logout:', error);
                    console.error('[AuthContext] Post-logout anonymous sign-in error details:', {
                      message: error?.message || 'Unknown error',
                      code: error?.code || 'No error code'
                    });
                    isSigningInAnonymouslyRef.current = false;
                    // If anonymous sign-in fails after logout, reset signing out state to prevent being stuck
                    console.log('[AuthContext] Resetting signing out state due to anonymous sign-in failure');
                    setIsSigningOut(false);
                    isSigningOutRef.current = false;
                  });
              } else {
                console.log('[AuthContext] Anonymous sign-in already in progress - skipping duplicate attempt after timeout');
              }
              // Clear the timeout ref since it completed
              timeoutRef.current = null;
            }, 2000); // 2 second delay to show the sign out actually happened
          } else {
            console.log('[AuthContext] Logout timeout already set - skipping duplicate timeout');
          }
        }
      }
      console.log('[AuthContext] Setting loading to false');
      setLoading(false);
      console.log('[AuthContext] ========== AUTH STATE CHANGE COMPLETE ==========');
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, []); // Remove isSigningOut dependency to prevent auth listener recreation

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