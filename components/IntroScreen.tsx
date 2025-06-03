import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, Pill, Syringe, LogIn, LogOut, CreditCard, Info, User, Mail } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';
// Import auth-related dependencies for Sign In functionality
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';
import { useRouter } from 'expo-router';
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
  const { usageData } = useUsageTracking();
  const router = useRouter();

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
    usageData: {
      exists: !!usageData,
      scansUsed: usageData?.scansUsed || 'undefined',
      limit: usageData?.limit || 'undefined',
      plan: usageData?.plan || 'undefined'
    }
  });

  // Log component mount to help debug visibility issues
  useEffect(() => {
    console.log('[IntroScreen] ========== COMPONENT LIFECYCLE ==========');
    console.log('[IntroScreen] Component mounted');
    console.log('[IntroScreen] Initial data state:', {
      userLoaded: !!user,
      profileLoading: isLoading,
      profileLoaded: !!profile,
      disclaimerLoaded: !!disclaimerText,
      usageDataLoaded: !!usageData
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

  useEffect(() => {
    console.log('[IntroScreen] ========== USAGE DATA CHANGE TRACKING ==========');
    console.log('[IntroScreen] Usage data changed:', {
      usageData: usageData ? {
        loaded: true,
        scansUsed: usageData.scansUsed,
        limit: usageData.limit,
        plan: usageData.plan,
        type: typeof usageData
      } : { loaded: false }
    });
  }, [usageData]);

  // Check for potential loading issues
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('[IntroScreen] ⚠️  Profile still loading after 5 seconds - potential issue');
      }
      if (!profile && !isLoading) {
        console.warn('[IntroScreen] ⚠️  No profile loaded and not loading - potential data issue');
      }
      if (!usageData) {
        console.warn('[IntroScreen] ⚠️  No usage data loaded - potential data issue');
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isLoading, profile, usageData]);

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

  const handleUpgradePress = useCallback(() => {
    console.log('[IntroScreen] Upgrade button pressed');
    // Navigate to pricing page for upgrade options
    router.push('/pricing');
  }, [router]);

  const handleLogoutPress = useCallback(async () => {
    console.log('[IntroScreen] ========== LOGOUT BUTTON PRESSED ==========');
    console.log('[IntroScreen] Current user state:', user ? {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email
    } : 'No user');
    console.log('[IntroScreen] Current isSigningOut state:', isSigningOut);
    console.log('[IntroScreen] Alert availability check:', typeof Alert);
    console.log('[IntroScreen] Alert.alert function check:', typeof Alert?.alert);
    console.log('[IntroScreen] Platform info:', { isMobileWeb });
    console.log('[IntroScreen] Showing confirmation dialog...');
    
    try {
      // Verify Alert is available before using it
      if (typeof Alert === 'undefined' || typeof Alert.alert !== 'function') {
        throw new Error('Alert.alert is not available on this platform');
      }
      
      // Show confirmation dialog
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out? You can always sign back in to access your saved calculations.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              console.log('[IntroScreen] User cancelled logout');
            },
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              console.log('[IntroScreen] ========== USER CONFIRMED LOGOUT ==========');
              console.log('[IntroScreen] User confirmed logout, initiating...');
              try {
                console.log('[IntroScreen] Calling logout function...');
                await logout();
                console.log('[IntroScreen] ✅ Logout completed successfully');
              } catch (error) {
                console.error('[IntroScreen] ❌ Logout error:', error);
                console.error('[IntroScreen] Error details:', {
                  message: error?.message || 'Unknown error',
                  code: error?.code || 'No error code',
                  stack: error?.stack || 'No stack trace'
                });
                Alert.alert(
                  'Sign Out Failed',
                  'There was an error signing out. Please try again.',
                  [{ text: 'OK', onPress: () => console.log('[IntroScreen] Error dialog dismissed') }]
                );
              }
            },
          },
        ],
        {
          onDismiss: () => {
            console.log('[IntroScreen] Alert dialog was dismissed without selection');
          }
        }
      );
      console.log('[IntroScreen] Alert.alert() called successfully');
    } catch (alertError) {
      console.error('[IntroScreen] ❌ Error showing alert dialog:', alertError);
      console.log('[IntroScreen] Alert failed, attempting direct logout confirmation...');
      
      // Fallback: Direct logout for web platform where Alert might not work properly
      const confirmLogout = confirm ? confirm('Are you sure you want to sign out?') : true;
      console.log('[IntroScreen] Fallback confirmation result:', confirmLogout);
      
      if (confirmLogout) {
        try {
          console.log('[IntroScreen] Fallback: Calling logout function directly...');
          await logout();
          console.log('[IntroScreen] ✅ Fallback logout completed successfully');
        } catch (directLogoutError) {
          console.error('[IntroScreen] ❌ Fallback logout error:', directLogoutError);
        }
      } else {
        console.log('[IntroScreen] Fallback: User cancelled logout');
      }
    }
  }, [logout, user, isSigningOut]);

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
              Debug: Profile={profile ? '✓' : '✗'} Loading={isLoading ? '✓' : '✗'} Usage={usageData ? '✓' : '✗'}
            </Text>
          </View>
        )}
        
        {/* Show loading state if profile is still loading */}
        {isLoading && !isSigningOut && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        )}

        {/* Show signing out message with better visual feedback */}
        {isSigningOut && (
          <View style={styles.signingOutContainer}>
            <View style={styles.signingOutCard}>
              <Text style={styles.signingOutTitle}>Signing Out</Text>
              <Text style={styles.signingOutText}>
                You've been signed out successfully. We'll sign you in anonymously in a moment to continue using the app.
              </Text>
            </View>
          </View>
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
                <Text style={styles.buttonText}>Scan Items</Text>
              </TouchableOpacity>
              
              {/* Secondary action */}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isMobileWeb && styles.buttonMobile]}
                onPress={handleManualEntryPress}
              >
                <Pill color={'#fff'} size={20} />
                <Text style={styles.buttonText}>Enter Details Manually</Text>
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
        
        {/* Bottom section with usage info, authentication and upgrade options - only show when not loading and not signing out */}
        {!isLoading && !isSigningOut && (
          <View style={styles.bottomSection}>
            {/* Usage Status Card - shows scans remaining and upgrade options together */}
            <View style={styles.usageStatusCard}>
              {/* Scans remaining display - show default if usageData is not available */}
              <View style={styles.usageInfoRow}>
                <Text style={styles.scanCreditsText}>
                  🎟️ {usageData ? (usageData.limit - usageData.scansUsed) : 3} scans remaining
                </Text>
                
                {/* Premium Badge (only for plus users) */}
                {usageData?.plan === 'plus' && (
                  <View style={styles.premiumBadgeContainer}>
                    <Text style={styles.premiumBadgeText}>Premium ⭐</Text>
                  </View>
                )}
              </View>
              
              {/* Upgrade button - appears right below scans for free users */}
              {(!usageData || usageData.plan === 'free') && (
                <TouchableOpacity 
                  style={[styles.upgradeButton, isMobileWeb && styles.upgradeButtonMobile]} 
                  onPress={handleUpgradePress}>
                  <CreditCard color={'#f59e0b'} size={16} />
                  <Text style={styles.upgradeText}>Upgrade for More Scans</Text>
                </TouchableOpacity>
              )}
              
              {/* Low scans warning for free users */}
              {usageData && (usageData.plan === 'free' && (usageData.limit - usageData.scansUsed) <= 1) && (
                <Text style={styles.lowScansWarning}>
                  ⚠️ Running low on scans. Upgrade to continue calculating doses.
                </Text>
              )}
            </View>
            
            {/* Sign-In section - appears for anonymous users or when signed out */}
            {(user?.isAnonymous || !user) && (
              <View style={styles.authSection}>
                <Text style={styles.authPromptText}>
                  {!user ? 'Signed out successfully. Sign in to save calculations and get unlimited scans' : 'Sign in to save calculations and get unlimited scans'}
                </Text>
                
                <TouchableOpacity 
                  style={[styles.signInButton, isMobileWeb && styles.signInButtonMobile]} 
                  onPress={handleSignInPress}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with Google"
                  accessibilityHint="Sign in using your Google account to save calculations and get unlimited scans">
                  <LogIn color="#10b981" size={16} />
                  <Text style={styles.signInButtonText}>Sign In with Google</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Profile section - appears for logged-in users */}
            {user && !user.isAnonymous && (
              <View style={styles.profileSection}>
                {console.log('[IntroScreen] Rendering profile section for authenticated user:', {
                  uid: user.uid,
                  displayName: user.displayName,
                  email: user.email
                })}
                
                {/* User info display */}
                <View style={styles.userInfoContainer}>
                  <View style={styles.userInfoRow}>
                    <User color="#3b82f6" size={18} />
                    <View style={styles.userInfoText}>
                      <Text style={styles.userDisplayName}>
                        {user.displayName || user.email?.split('@')[0] || 'User'}
                      </Text>
                      {user.email && (
                        <Text style={styles.userEmail}>{user.email}</Text>
                      )}
                    </View>
                  </View>
                </View>
                
                {/* Sign out button - always visible for better discoverability */}
                <TouchableOpacity 
                  style={[styles.signOutButton, isMobileWeb && styles.signOutButtonMobile]} 
                  onPress={() => {
                    console.log('[IntroScreen] Sign out button onPress triggered');
                    console.log('[IntroScreen] About to call handleLogoutPress');
                    handleLogoutPress();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out"
                  accessibilityHint="Sign out of your account. You will be asked to confirm this action."
                  testID="sign-out-button">
                  <LogOut color="#ef4444" size={16} />
                  <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
                {console.log('[IntroScreen] Sign out button rendered successfully')}
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
    backgroundColor: '#F8FAFC',
  },
  signingOutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 320,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signingOutTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  signingOutText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
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
    width: '100%',
    alignItems: 'center',
    marginBottom: 24, // Reduced from 32 to 24 to create more space for content below
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    width: '80%',
    marginBottom: 20, // Increased from 12 to 20 for better spacing
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonMobile: { 
    paddingVertical: 16, 
    paddingHorizontal: 28, 
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
  // Bottom section containing usage, auth and upgrade elements
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16, // Reduced from 20 to 16 for more compact layout
    alignItems: 'center',
    gap: 16, // Reduced from 20 to 16 for tighter spacing between elements
  },
  // Usage Status Card - combines scans remaining with upgrade
  usageStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12, // Reduced from 16 to 12 for more compact design
    padding: 12, // Reduced from 16 to 12 for smaller footprint
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow for more compact look
    shadowOpacity: 0.08, // Reduced shadow opacity
    shadowRadius: 3, // Reduced shadow radius
    elevation: 2, // Reduced elevation
  },
  usageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8, // Reduced from 12 to 8 for more compact layout
  },
  scanCreditsText: { 
    color: '#333333', 
    fontSize: 13, // Reduced from 14 to 13 for smaller text
    fontWeight: '600',
    textAlign: 'center',
  },
  premiumBadgeContainer: { 
    backgroundColor: '#FFD700', 
    borderRadius: 8, 
    padding: 4, 
    marginLeft: 8,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  premiumBadgeText: { color: '#333333', fontSize: 12, fontWeight: 'bold' },
  lowScansWarning: {
    fontSize: 12, // Reduced from 13 to 12 for more compact layout
    color: '#d97706',
    textAlign: 'center',
    marginTop: 6, // Reduced from 8 to 6 for tighter spacing
    fontStyle: 'italic',
    lineHeight: 16, // Reduced from 18 to 16 for tighter line height
  },
  // Authentication section for anonymous users
  authSection: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  authPromptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
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
  // Profile section for logged-in users
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  userInfoContainer: {
    width: '100%',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userInfoText: {
    marginLeft: 12,
    flex: 1,
  },
  userDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
  },
  signOutButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#ef4444',
  },
  // Upgrade button
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8, // Reduced from 10 to 8 for more compact button
    paddingHorizontal: 14, // Reduced from 16 to 14 for more compact button
    borderRadius: 8, // Reduced from 10 to 8 for more compact design
    borderWidth: 1,
    borderColor: '#f59e0b',
    width: '100%',
  },
  upgradeButtonMobile: {
    paddingVertical: 9, // Reduced from 12 to 9 for mobile
    paddingHorizontal: 16, // Reduced from 18 to 16 for mobile
  },
  upgradeText: {
    color: '#92400e',
    fontSize: 13, // Reduced from 14 to 13 for smaller text
    fontWeight: '600',
    marginLeft: 6,
  },
});