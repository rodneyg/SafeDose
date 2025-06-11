import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, WarningLevel, getUserWarningLevel, getDisclaimerText } from '@/types/userProfile';
import { logAnalyticsEvent, ANALYTICS_EVENTS, setPersonalizationUserProperties } from '@/lib/analytics';

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
  
  // Add refs to track loading state and prevent race conditions
  const isLoadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load profile from storage on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      // No user available, stop loading
      console.log('[UserProfile] No user available, stopping loading state');
      setIsLoading(false);
      isLoadingRef.current = false;
    }
    
    // Cleanup function to cancel any ongoing operations
    return () => {
      if (abortControllerRef.current) {
        console.log('[UserProfile] Aborting ongoing operations due to effect cleanup');
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [user]);

  // Handle profile migration when user transitions from anonymous to authenticated
  useEffect(() => {
    const handleProfileMigration = async () => {
      if (user && !user.isAnonymous && profile) {
        // User has transitioned from anonymous to authenticated
        // Check if profile needs to be backed up to Firebase
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // Profile doesn't exist in Firebase, backup the current profile
            console.log('[UserProfile] Backing up local profile to Firebase for authenticated user');
            const profileToBackup = {
              ...profile,
              userId: user.uid,
              dateCreated: profile.dateCreated || new Date().toISOString()
            };
            
            await setDoc(docRef, profileToBackup);
            console.log('[UserProfile] ✅ Profile successfully backed up to Firebase');
            
            // Log detailed analytics for profile backup
            logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKED_UP, {
              isLicensedProfessional: profileToBackup.isLicensedProfessional,
              isPersonalUse: profileToBackup.isPersonalUse,
              isCosmeticUse: profileToBackup.isCosmeticUse,
              userId: user.uid,
              previouslyAnonymous: true
            });
            
            // Update local profile with userId
            setProfile(profileToBackup);
            await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profileToBackup));
            
            // Update analytics user properties after backup
            setPersonalizationUserProperties(profileToBackup);
          } else {
            console.log('[UserProfile] Profile already exists in Firebase, no backup needed');
          }
        } catch (error) {
          console.warn('[UserProfile] ⚠️ Failed to backup profile to Firebase:', error);
          
          // Log analytics for failed backup
          logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKUP_FAILED, {
            isLicensedProfessional: profile.isLicensedProfessional,
            isPersonalUse: profile.isPersonalUse,
            isCosmeticUse: profile.isCosmeticUse,
            error: (error as Error)?.message || 'Unknown error'
          });
        }
      }
    };

    handleProfileMigration();
  }, [user, profile]);

  // Cleanup effect to ensure no memory leaks
  useEffect(() => {
    return () => {
      console.log('[UserProfile] Component unmounting, cleaning up resources');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      isLoadingRef.current = false;
    };
  }, []);

  const loadProfile = async () => {
    // Prevent concurrent calls to loadProfile
    if (isLoadingRef.current) {
      console.log('[UserProfile] Load already in progress, skipping duplicate call');
      return;
    }
    
    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Set up abort controller for this load operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Set up a fallback timeout to ensure loading state eventually resolves
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[UserProfile] ⚠️ Profile loading timeout reached, forcing loading state to false');
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setIsLoading(false);
        isLoadingRef.current = false;
        
        // Log analytics for timeout
        logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKUP_FAILED, {
          error: 'Loading timeout after 15 seconds',
          triggeredDuringLoad: true,
          timeoutFallback: true
        });
      }, 15000); // 15 second timeout
      
      console.log('[UserProfile] ========== LOADING PROFILE START ==========');
      console.log('[UserProfile] User state:', {
        userId: user?.uid || 'No user',
        isAnonymous: user?.isAnonymous || 'No user',
        userType: user ? (user.isAnonymous ? 'anonymous' : 'authenticated') : 'none'
      });
      
      let profileData: UserProfile | null = null;
      let dataSource = 'none';

      // For both anonymous and authenticated users, try Firebase first if user has UID
      if (user?.uid) {
        // For all users with UID (anonymous and authenticated), try Firebase first
        console.log('[UserProfile] User with UID detected - trying Firebase first');
        console.log('[UserProfile] User type:', user.isAnonymous ? 'anonymous' : 'authenticated');
        try {
          // Check if operation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[UserProfile] Operation aborted before Firebase call');
            return;
          }
          
          const docRef = doc(db, 'userProfiles', user.uid);
          
          // Create promise with timeout for Firebase operation
          const firebasePromise = getDoc(docRef);
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Firebase operation timeout')), 10000); // 10 second timeout for Firebase
          });
          
          const docSnap = await Promise.race([firebasePromise, timeoutPromise]);
          
          // Check if operation was aborted after Firebase call
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[UserProfile] Operation aborted after Firebase call');
            return;
          }
          
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
          // Check if this is an abort error
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[UserProfile] Firebase operation was aborted');
            return;
          }
          
          console.warn('[UserProfile] ⚠️ Firebase load failed, falling back to local storage:', firebaseError);
          console.warn('[UserProfile] Error details:', {
            code: (firebaseError as any)?.code || 'No error code',
            message: (firebaseError as Error)?.message || 'Unknown error'
          });
        }

        // Fallback to local storage if Firebase failed
        if (!profileData) {
          try {
            // Check if operation was aborted
            if (abortControllerRef.current?.signal.aborted) {
              console.log('[UserProfile] Operation aborted before local storage fallback');
              return;
            }
            
            const storedProfile = await AsyncStorage.getItem(USER_PROFILE_STORAGE_KEY);
            if (storedProfile) {
              profileData = JSON.parse(storedProfile);
              dataSource = 'local_storage_fallback';
              console.log('[UserProfile] ✅ Profile loaded from local storage (fallback):', profileData);
              
              // Since we have a local profile but Firebase failed initially, 
              // try to backup this profile to Firebase (this handles cases where 
              // user has local profile but it's not synced to Firebase)
              // Only attempt backup if Firebase rules allow it (which they now do for anonymous users too)
              console.log('[UserProfile] Attempting to backup local profile to Firebase...');
              try {
                // Check if operation was aborted
                if (abortControllerRef.current?.signal.aborted) {
                  console.log('[UserProfile] Operation aborted before backup attempt');
                  return;
                }
                
                const docRef = doc(db, 'userProfiles', user.uid);
                const profileToBackup = {
                  ...profileData,
                  userId: user.uid,
                  dateCreated: profileData.dateCreated || new Date().toISOString()
                };
                
                // Create promise with timeout for backup operation
                const backupPromise = setDoc(docRef, profileToBackup);
                const backupTimeoutPromise = new Promise<never>((_, reject) => {
                  setTimeout(() => reject(new Error('Backup operation timeout')), 5000); // 5 second timeout for backup
                });
                
                await Promise.race([backupPromise, backupTimeoutPromise]);
                
                // Check if operation was aborted after backup
                if (abortControllerRef.current?.signal.aborted) {
                  console.log('[UserProfile] Operation aborted after backup');
                  return;
                }
                
                console.log('[UserProfile] ✅ Local profile backed up to Firebase during load');
                
                // Log analytics for backup during load
                logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKED_UP, {
                  isLicensedProfessional: profileToBackup.isLicensedProfessional,
                  isPersonalUse: profileToBackup.isPersonalUse,
                  isCosmeticUse: profileToBackup.isCosmeticUse,
                  userId: user.uid,
                  triggeredDuringLoad: true
                });
                
                // Update profileData with the backed up version
                profileData = profileToBackup;
                dataSource = 'local_backup_to_firebase';
              } catch (backupError) {
                // Check if this is an abort error
                if (abortControllerRef.current?.signal.aborted) {
                  console.log('[UserProfile] Backup operation was aborted');
                  return;
                }
                
                console.warn('[UserProfile] ⚠️ Failed to backup local profile to Firebase during load:', backupError);
                
                // Log analytics for failed backup during load
                logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKUP_FAILED, {
                  isLicensedProfessional: profileData.isLicensedProfessional,
                  isPersonalUse: profileData.isPersonalUse,
                  isCosmeticUse: profileData.isCosmeticUse,
                  error: (backupError as Error)?.message || 'Unknown error',
                  triggeredDuringLoad: true
                });
              }
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
          // Check if operation was aborted
          if (abortControllerRef.current?.signal.aborted) {
            console.log('[UserProfile] Operation aborted before local storage check');
            return;
          }
          
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

      // Check if operation was aborted before setting final state
      if (abortControllerRef.current?.signal.aborted) {
        console.log('[UserProfile] Operation aborted before setting final profile state');
        return;
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
      
      // Set analytics user properties if profile was loaded
      if (profileData) {
        setPersonalizationUserProperties(profileData);
      }
      
      console.log('[UserProfile] ========== LOADING PROFILE COMPLETE ==========');
    } catch (error) {
      console.error('[UserProfile] ❌ CRITICAL ERROR loading user profile:', error);
      console.error('[UserProfile] Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Log analytics for critical error
      logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_BACKUP_FAILED, {
        error: (error as Error)?.message || 'Unknown critical error',
        triggeredDuringLoad: true,
        criticalError: true
      });
    } finally {
      // Clear the loading timeout since we're completing
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      
      // Only update loading state if this operation hasn't been aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
        console.log('[UserProfile] Loading state set to false');
      } else {
        console.log('[UserProfile] Operation was aborted, not updating loading state');
      }
      
      isLoadingRef.current = false;
      
      // Clean up abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      // Save to local storage first (as cache/fallback)
      await AsyncStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(newProfile));
      
      // Save to Firebase if user is available (both anonymous and authenticated users supported)
      if (user?.uid) {
        console.log('[UserProfile] Saving to Firebase for user:', {
          uid: user.uid,
          userType: user.isAnonymous ? 'anonymous' : 'authenticated'
        });
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          await setDoc(docRef, newProfile);
          console.log('User profile saved to Firebase');
          
          // Log detailed analytics for profile save to Firebase
          logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_SAVED_FIREBASE, {
            isLicensedProfessional: newProfile.isLicensedProfessional,
            isPersonalUse: newProfile.isPersonalUse,
            isCosmeticUse: newProfile.isCosmeticUse,
            userId: user.uid,
            userType: user.isAnonymous ? 'anonymous' : 'authenticated'
          });
        } catch (firebaseError) {
          console.warn('[UserProfile] Error saving profile to Firebase, but local storage succeeded:', firebaseError);
          console.warn('[UserProfile] Firebase error details:', {
            code: (firebaseError as any)?.code || 'No error code',
            message: (firebaseError as Error)?.message || 'Unknown error'
          });
          
          // Log analytics for failed Firebase save
          logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_SAVE_FIREBASE_FAILED, {
            isLicensedProfessional: newProfile.isLicensedProfessional,
            isPersonalUse: newProfile.isPersonalUse,
            isCosmeticUse: newProfile.isCosmeticUse,
            error: (firebaseError as Error)?.message || 'Unknown error'
          });
          // Don't throw here - local storage save was successful
        }
      } else {
        console.log('User not available, profile saved to local storage only');
        
        // Log analytics for local-only save
        logAnalyticsEvent(ANALYTICS_EVENTS.PROFILE_SAVED_LOCAL_ONLY, {
          isLicensedProfessional: newProfile.isLicensedProfessional,
          isPersonalUse: newProfile.isPersonalUse,
          isCosmeticUse: newProfile.isCosmeticUse
        });
      }
      
      setProfile(newProfile);
      
      // Set analytics user properties based on profile
      setPersonalizationUserProperties(newProfile);
    } catch (error) {
      console.error('Error saving user profile:', error);
      throw error;
    }
  };

  const clearProfile = async () => {
    try {
      // Clear from local storage
      await AsyncStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      
      // Clear from Firebase if user is available (both anonymous and authenticated users)
      if (user?.uid) {
        console.log('[UserProfile] Clearing from Firebase for user:', {
          uid: user.uid,
          userType: user.isAnonymous ? 'anonymous' : 'authenticated'
        });
        try {
          const docRef = doc(db, 'userProfiles', user.uid);
          await setDoc(docRef, {}, { merge: false }); // Effectively deletes the document
          console.log('User profile cleared from Firebase');
        } catch (firebaseError) {
          console.warn('[UserProfile] Error clearing profile from Firebase:', firebaseError);
          console.warn('[UserProfile] Firebase error details:', {
            code: (firebaseError as any)?.code || 'No error code',
            message: (firebaseError as Error)?.message || 'Unknown error'
          });
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