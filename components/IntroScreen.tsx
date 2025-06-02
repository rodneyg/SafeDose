import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, Pill, LogIn, LogOut, CreditCard, Info, User, Mail, Pencil } from 'lucide-react-native'; // Added Pencil, removed Syringe, Modal
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
    
    // Show confirmation dialog
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You can always sign back in to access your saved calculations.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[IntroScreen] User confirmed logout, initiating...');
            try {
              console.log('[IntroScreen] Calling logout function...');
              await logout();
              console.log('[IntroScreen] ✅ Logout completed successfully');
            } catch (error) {
              console.error('[IntroScreen] ❌ Logout error:', error);
              Alert.alert(
                'Sign Out Failed',
                'There was an error signing out. Please try again.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  }, [logout]);

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
            {/* Concise Welcome Message */}
            <Text style={styles.conciseWelcomeText}>
              {user?.displayName ? `Hello, ${user.displayName}!` : 'Ready to get started?'}
            </Text>

            {/* Main action buttons grouped together */}
            <View style={styles.actionButtonsContainer}>
              {/* Primary action: Scan Items */}
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isMobileWeb && styles.buttonMobile]}
                onPress={handleScanPress}>
                <CameraIcon color={'#fff'} size={24} />
                <Text style={styles.buttonText}>Scan Items</Text>
              </TouchableOpacity>

              {/* Secondary action: Enter Details Manually */}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, isMobileWeb && styles.buttonMobile]}
                onPress={handleManualEntryPress}>
                <Pencil color={'#007AFF'} size={24} />
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Enter Details Manually</Text>
              </TouchableOpacity>
            </View>

            {/* Scans Remaining / Upgrade Text Line */}
            <View style={styles.scansRemainingContainer}>
              {usageData?.plan === 'plus' ? (
                <Text style={styles.scansRemainingText}>You have Unlimited Scans.</Text>
              ) : (
                <Text style={styles.scansRemainingText}>
                  You have{' '}
                  <Text style={
                    (usageData && (usageData.limit - usageData.scansUsed) <= 5) ? 
                    styles.lowScansText : styles.normalScansText
                  }>
                    {usageData ? usageData.limit - usageData.scansUsed : '...'}
                  </Text>
                  {' '}scans remaining.{' '}
                  <TouchableOpacity onPress={handleUpgradePress} style={styles.upgradeLink}>
                    <Text style={styles.upgradeLinkText}>[Upgrade]</Text>
                  </TouchableOpacity>
                </Text>
              )}
            </View>
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
    justifyContent: 'center', // Centering content vertically
    padding: 16,
  },
  conciseWelcomeText: {
    fontSize: 20, // Slightly larger for welcome
    fontWeight: '400', // Regular weight
    color: '#333333',
    textAlign: 'center',
    marginBottom: 30, // Space below welcome message
  },
  actionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20, 
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12, // Increased gap for icon
    width: '90%', // Made buttons wider
    marginBottom: 16, // Space between buttons
    paddingVertical: 16, // Increased padding for larger touch target
    paddingHorizontal: 24,
    borderRadius: 12, // Slightly more rounded corners
    borderWidth: 1, // Added for secondary button, primary will override
  },
  buttonMobile: {
    // Specific mobile adjustments if needed, otherwise keep consistent
    paddingVertical: 18,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF', // Ensure border color matches background
  },
  secondaryButton: {
    backgroundColor: 'transparent', // Outline style
    borderColor: '#007AFF', // Border color for outline
  },
  buttonText: {
    fontSize: 18, // Larger text for buttons
    fontWeight: '600',
    textAlign: 'center',
    color: '#ffffff', // Default text color (for primary button)
  },
  secondaryButtonText: {
    color: '#007AFF', // Text color for secondary button
  },
  scansRemainingContainer: {
    marginTop: 20, // Space above the scans remaining text
    alignItems: 'center',
  },
  scansRemainingText: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
  },
  lowScansText: {
    color: '#D9534F', // Bootstrap's danger color (example)
    fontWeight: 'bold',
  },
  normalScansText: {
    color: '#5CB85C', // Bootstrap's success color (example)
    fontWeight: 'bold',
  },
  upgradeLink: {
    // Inline touchable, no specific layout apart from text styling inside
  },
  upgradeLinkText: {
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: 'bold', // Make upgrade link prominent
    fontSize: 14, // Match surrounding text
  },
  // Removed styles: welcomeContainer, text (old welcome), icon, disclaimerContainer, 
  // disclaimerIconContainer, disclaimerIcon, disclaimerText, bottomSection, usageStatusCard,
  // usageInfoRow, scanCreditsText, premiumBadgeContainer, premiumBadgeText, lowScansWarning,
  // authSection, authPromptText, signInButton, signInButtonMobile, signInButtonText,
  // profileSection, userInfoContainer, userInfoRow, userInfoText, userDisplayName, userEmail,
  // signOutButton, signOutButtonMobile, signOutButtonText, upgradeButton (old), upgradeButtonMobile (old),
  // upgradeText (old)
});