import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, Pill, Syringe, LogIn, LogOut, Info, User, Mail } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';
// Import auth-related dependencies for Sign In functionality
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants'; // For accessing env variables from app.config.js

interface IntroScreenProps {
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  resetFullForm: (startStep?: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
  setNavigatingFromIntro?: (value: boolean) => void;
}

export default function IntroScreen({ setScreenStep, resetFullForm, setNavigatingFromIntro }: IntroScreenProps) {
  console.log('[IntroScreen] ========== INTRO SCREEN RENDER ==========');
  
  const { user, auth, logout, isSigningOut } = useAuth();
  const { disclaimerText, profile, isLoading } = useUserProfile();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  console.log('[IntroScreen] Detailed component state:', {
    user: {
      uid: user?.uid || 'No user',
      isAnonymous: user?.isAnonymous,
      displayName: user?.displayName || 'No display name',
      email: user?.email || 'No email'
    },
    profile: {
      exists: !!profile,
      isLoading,
      profileData: profile ? {
        isLicensedProfessional: profile.isLicensedProfessional,
        isPersonalUse: profile.isPersonalUse,
        isCosmeticUse: profile.isCosmeticUse,
        dateCreated: profile.dateCreated
      } : null
    },
    disclaimerText: {
      exists: !!disclaimerText,
      length: disclaimerText?.length || 0,
      preview: disclaimerText ? disclaimerText.substring(0, 50) + '...' : 'null'
    },
    isProfileMenuOpen
  });

  // Log component mount to help debug visibility issues
  useEffect(() => {
    console.log('[IntroScreen] ========== COMPONENT LIFECYCLE ==========');
    console.log('[IntroScreen] Component mounted');
    console.log('[IntroScreen] Initial data state:', {
      userLoaded: !!user,
      profileLoading: isLoading,
      profileLoaded: !!profile,
      disclaimerLoaded: !!disclaimerText
    });
    
    // Force log to make sure this component actually renders
    console.log('[IntroScreen] Currently visible, screenStep should be "intro"');
    
    return () => {
      console.log('[IntroScreen] Component unmounted');
    };
  }, []);

  // Log data changes to track when things become available
  useEffect(() => {
    console.log('[IntroScreen] ========== DATA CHANGE TRACKING ==========');
    console.log('[IntroScreen] Profile data changed:', {
      isLoading,
      profile: profile ? {
        loaded: true,
        type: typeof profile,
        keys: Object.keys(profile)
      } : { loaded: false },
      disclaimerText: disclaimerText ? {
        loaded: true,
        length: disclaimerText.length,
        type: typeof disclaimerText
      } : { loaded: false }
    });
  }, [profile, isLoading, disclaimerText]);

  // Check for potential loading issues
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[IntroScreen] ⚠️  Profile still loading after 5 seconds - potential issue');
      }
      if (!profile && !isLoading) {
        console.warn('[IntroScreen] ⚠️  No profile loaded and not loading - potential data issue');
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isLoading, profile]);

  // Use memoized handlers to ensure stable references across renders
  const handleSignInPress = useCallback(() => {
    console.log('[IntroScreen] Sign In button pressed');
    const provider = new GoogleAuthProvider();
    
    // Set custom parameters for better UX
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('[IntroScreen] Initiating Google Sign-In...');
    
    // Use Firebase popup sign-in method for authentication
    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Google Sign-In successful', result.user);
        if (user?.isAnonymous) {
          // The anonymous account will be automatically linked to the signed-in account
          console.log('Linked anonymous account with Google');
        } else {
          console.log('Signed in with Google');
        }
        // Give the authentication state time to update
        setTimeout(() => {
          console.log('Authentication successful, auth state should have updated');
        }, 100);
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        
        // Log additional context for debugging
        if (error.code === 'auth/popup-blocked') {
          console.error('Popup was blocked - user needs to allow popups for this site');
        } else if (error.code === 'auth/popup-closed-by-user') {
          console.error('User closed the popup before completing sign-in');
        } else if (error.code === 'auth/operation-not-allowed') {
          console.error('Google Sign-In is not enabled in Firebase Console');
        } else if (error.code === 'auth/unauthorized-domain') {
          console.error('Domain is not authorized in Firebase Console');
        } else {
          console.error('Unknown Google Sign-In error:', error);
        }
      });
  }, [auth, user]);

  const handleLogoutPress = useCallback(async () => {
    console.log('[IntroScreen] ========== LOGOUT BUTTON PRESSED ==========');
    console.log('[IntroScreen] Closing profile menu and initiating logout...');
    setIsProfileMenuOpen(false);
    try {
      console.log('[IntroScreen] Calling logout function...');
      await logout();
      console.log('[IntroScreen] ✅ Logout completed successfully');
    } catch (error) {
      console.error('[IntroScreen] ❌ Logout error:', error);
    }
  }, [logout]);
  
  const toggleProfileMenu = useCallback(() => {
    console.log('[IntroScreen] ========== PROFILE MENU TOGGLE ==========');
    console.log('[IntroScreen] Current isProfileMenuOpen:', isProfileMenuOpen);
    // Always toggle the profile menu, regardless of authentication status
    setIsProfileMenuOpen(prevState => {
      const newState = !prevState;
      console.log('[IntroScreen] Setting isProfileMenuOpen to:', newState);
      return newState;
    });
  }, [isProfileMenuOpen]);

  // For React Native, we'll close the menu manually in button handlers
  // instead of using web-specific tap outside detection

  // Check if the auto-login flag is enabled
  useEffect(() => {
    // Read TEST_LOGIN environment variable from app.config.js
    const testLogin = Constants.expoConfig?.extra?.TEST_LOGIN === true;
    if (testLogin && user?.isAnonymous) {
      console.log('[IntroScreen] Auto-login triggered by REACT_APP_TEST_LOGIN flag');
      // Automatically trigger login for testing purposes when flag is set
      handleSignInPress();
    }
  }, [user, handleSignInPress]);

  const handleScanPress = useCallback(() => {
    console.log('[IntroScreen] Scan button pressed');
    // Mark that we're navigating from intro screen
    if (setNavigatingFromIntro) {
      console.log('[IntroScreen] Setting navigatingFromIntro to true');
      setNavigatingFromIntro(true);
    }
    // Navigate directly to scan without resetting the form
    console.log('[IntroScreen] Calling setScreenStep("scan")');
    setScreenStep('scan');
  }, [setScreenStep, setNavigatingFromIntro]);
  
  const handleManualEntryPress = useCallback(() => {
    console.log('[IntroScreen] Manual entry button pressed');
    // Mark that we're navigating from intro screen
    if (setNavigatingFromIntro) {
      console.log('[IntroScreen] Setting navigatingFromIntro to true');
      setNavigatingFromIntro(true);
    }
    // Ensure we have clean form state before starting manual entry
    console.log('[IntroScreen] Calling resetFullForm("dose")');
    resetFullForm('dose');
    console.log('[IntroScreen] Calling setScreenStep("manualEntry")');
    setScreenStep('manualEntry');
  }, [resetFullForm, setScreenStep, setNavigatingFromIntro]);
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        {/* Debug info overlay (only in development) */}
        {__DEV__ && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>
              Debug: Profile={profile ? '✓' : '✗'} Loading={isLoading ? '✓' : '✗'}
            </Text>
          </View>
        )}
        
        {/* Show loading state if profile is still loading */}
        {isLoading && !isSigningOut && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        )}

        {/* Show signing out message */}
        {isSigningOut && (
          <View style={styles.signingOutContainer}>
            <Text style={styles.signingOutText}>
              Signed out successfully. You will be signed in anonymously shortly.
            </Text>
          </View>
        )}
        
        {/* Invisible overlay to close menu when tapping outside */}
        {isProfileMenuOpen && (
          <TouchableOpacity 
            style={styles.menuOverlay} 
            onPress={() => setIsProfileMenuOpen(false)}
            activeOpacity={1}
          />
        )}
        
        {/* Main content section - only show when not loading and not signing out */}
        {!isLoading && !isSigningOut && (
          <View style={styles.content}>
            {/* App icon and welcome message */}
            <View style={styles.welcomeContainer}>
              <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
              
              {/* Dynamic welcome message based on authentication status */}
              {user && !user.isAnonymous && user.displayName ? (
                <Text style={styles.text}>Welcome back, {user.displayName}. Ready to scan?</Text>
              ) : (
                <Text style={styles.text}>Welcome! Calculate your dose accurately.</Text>
              )}
            </View>
            
            {/* Main action buttons grouped together (Law of Proximity) */}
            <View style={styles.actionButtonsContainer}>
              {/* Primary action */}
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton, isMobileWeb && styles.buttonMobile]} 
                onPress={handleScanPress}>
                <CameraIcon color={'#fff'} size={20} />
                <Text style={styles.buttonText}>Scan</Text>
              </TouchableOpacity>
              
              {/* Secondary action */}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isMobileWeb && styles.buttonMobile]}
                onPress={handleManualEntryPress}
              >
                <Pill color={'#fff'} size={20} />
                <Text style={styles.buttonText}>Manual</Text>
              </TouchableOpacity>
            </View>
            
            {/* Disclaimer with Info icon - show default if disclaimerText is not available */}
            <View style={styles.disclaimerContainer}>
              <View style={styles.disclaimerIconContainer}>
                <Info color={'#856404'} size={14} style={styles.disclaimerIcon} />
                <Text style={styles.disclaimerText}>
                  {disclaimerText || 'Always consult a licensed healthcare professional before administering any medication.'}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Bottom section with authentication - only show when not loading and not signing out */}
        {!isLoading && !isSigningOut && (
          <View style={styles.bottomSection}>
            {/* Sign-In section - appears for anonymous users or when signed out */}
            {(user?.isAnonymous || !user) && (
              <View style={styles.authSection}>
                <Text style={styles.authPromptText}>
                  {!user ? 'Signed out successfully. Sign in to save calculations and get unlimited scans' : 'Sign in to save calculations and get unlimited scans'}
                </Text>
                <TouchableOpacity 
                  style={[styles.signInButton, isMobileWeb && styles.signInButtonMobile]} 
                  onPress={toggleProfileMenu}>
                  <LogIn color="#10b981" size={16} />
                  <Text style={styles.signInButtonText}>Sign In</Text>
                </TouchableOpacity>
                
                {/* Profile dropdown menu positioned above button */}
                {isProfileMenuOpen && (
                  <View style={styles.authMenu}>
                    <TouchableOpacity 
                      style={styles.authMenuItem}
                      onPress={() => {
                        setIsProfileMenuOpen(false);
                        handleSignInPress();
                      }}>
                      <LogIn color="#10b981" size={16} />
                      <Text style={styles.authMenuText}>Sign In with Google</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            
            {/* Profile section - appears for logged-in users */}
            {user && !user.isAnonymous && (
              <View style={styles.profileSection}>
                <TouchableOpacity 
                  style={[styles.profileButton, isMobileWeb && styles.profileButtonMobile]} 
                  onPress={toggleProfileMenu}>
                  <User color="#3b82f6" size={16} />
                  <Text style={styles.profileButtonText}>
                    {user.email ? user.email.split('@')[0] : 'Profile'}
                  </Text>
                </TouchableOpacity>
                
                {/* Profile dropdown menu */}
                {isProfileMenuOpen && (
                  <View style={styles.profileMenu}>
                    {user?.email && (
                      <View style={styles.profileMenuItem}>
                        <Mail color="#64748b" size={16} />
                        <Text style={styles.profileMenuEmail}>{user.email}</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.logoutButton}
                      onPress={handleLogoutPress}>
                      <LogOut color="#ef4444" size={16} />
                      <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  // Debug overlay for development
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  // Signing out state
  signingOutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.05)', // Slight overlay to indicate change
  },
  signingOutText: {
    fontSize: 16,
    color: '#333', // Darker text for better readability
    textAlign: 'center',
    paddingHorizontal: 30, // Ensure text doesn't touch edges
  },
  // Invisible overlay to capture taps outside the menu
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5, // Below profile menu but above everything else
  },
  // Main content section
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Changed from center to flex-start for better control
    paddingTop: 40, // Add top padding for breathing room
    padding: 16,
  },
  // Welcome section
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 30, // Reduced from 40 to 30 to create more space for content below
  },
  icon: { 
    marginBottom: 8,
  },
  text: { 
    fontSize: 18,
    fontWeight: '600',
    color: '#000000', 
    textAlign: 'center', 
    paddingHorizontal: 16,
  },
  // Action buttons group (Law of Proximity)
  actionButtonsContainer: {
    flexDirection: 'row', // Changed from column to row for side-by-side layout
    width: '100%',
    justifyContent: 'space-evenly', // Distribute buttons evenly
    alignItems: 'center',
    marginBottom: 24, // Reduced from 32 to 24 to create more space for content below
    paddingHorizontal: 20, // Add horizontal padding for better spacing
  },
  button: { 
    flexDirection: 'column', // Changed to column to stack icon and text vertically
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, // Reduced gap for compact design
    width: 100, // Reduced width for slightly smaller buttons
    height: 100, // Reduced height to match width for square shape
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16, // Slightly larger border radius for better appearance
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonMobile: { 
    paddingVertical: 18, 
    paddingHorizontal: 18,
    width: 120, // Reduced size for mobile (was 140)
    height: 120,
  },
  primaryButton: {
    backgroundColor: '#007AFF', 
  },
  secondaryButton: {
    backgroundColor: '#6366f1',
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '600',
    textAlign: 'center',
  },
  // Disclaimer styles
  disclaimerContainer: { 
    backgroundColor: '#FFF3CD', 
    padding: 10,
    borderRadius: 8, 
    marginBottom: 32, // Increased from 16 to 32 to create better visual separation from bottom section
    width: '90%', 
    maxWidth: 500,
    borderLeftWidth: 3,
    borderLeftColor: '#856404',
  },
  disclaimerIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 8,
    marginTop: 3,
  },
  disclaimerText: { 
    fontSize: 11, 
    color: '#856404', 
    textAlign: 'left',
    fontStyle: 'italic',
    flex: 1,
  },
  // Bottom section containing authentication elements
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  // Authentication section for anonymous users
  authSection: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12, // Reduced from 16 to 12 for more compact layout
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  authPromptText: {
    fontSize: 13, // Reduced from 14 for more compact layout
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10, // Reduced from 12 for more compact layout
    lineHeight: 18, // Reduced from 20 for more compact layout
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  signInButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#10b981',
  },
  authMenu: {
    position: 'absolute',
    bottom: 55, // Position above the sign-in button
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10, // Ensure menu appears above the overlay
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  authMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  authMenuText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#10b981',
  },
  // Profile section for logged-in users
  profileSection: {
    alignItems: 'center',
    position: 'relative',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#334155',
  },
  // Profile menu dropdown
  profileMenu: {
    position: 'absolute',
    bottom: 46, // Position above the profile button
    left: '50%',
    transform: [{ translateX: -90 }], // Center the menu
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    zIndex: 10, // Ensure menu appears above the overlay
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  profileMenuEmail: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 8,
    color: '#64748b',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#ef4444',
  },
});