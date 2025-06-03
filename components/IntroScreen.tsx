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
  
  // State for profile dropdown visibility
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

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
              // Close the profile dropdown after successful logout
              setShowProfileDropdown(false);
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

  const handleProfileIconPress = useCallback(() => {
    console.log('[IntroScreen] Profile icon pressed');
    setShowProfileDropdown(!showProfileDropdown);
  }, [showProfileDropdown]);

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
    
    // Debug log: Verify navigation was successful
    setTimeout(() => {
      console.log('[IntroScreen] 🔍 POST-NAVIGATION DEBUG: Scan navigation completed');
    }, 100);
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
    
    // Debug log: Verify navigation was successful
    setTimeout(() => {
      console.log('[IntroScreen] 📝 POST-NAVIGATION DEBUG: Manual entry navigation completed');
    }, 100);
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
            {/* Debug log: Track what UI elements are being rendered */}
            {console.log('[IntroScreen] 🎨 RENDER DEBUG: Main content rendering with conditions:', {
              isLoading,
              isSigningOut,
              userExists: !!user,
              userIsAnonymous: user?.isAnonymous,
              profileExists: !!profile,
              usageDataExists: !!usageData,
              scansRemaining: usageData ? (usageData.limit - usageData.scansUsed) : 'unknown'
            }) || null}
            {/* New Header with App Title and Profile Icon */}
            <View style={styles.header}>
              {/* App Title - centered */}
              <Text style={styles.appTitle}>SafeDose</Text>
              
              {/* Profile Icon (top right) - only show for authenticated users */}
              {user && !user.isAnonymous && (
                <TouchableOpacity 
                  style={styles.profileIconContainer}
                  onPress={handleProfileIconPress}
                  accessibilityRole="button"
                  accessibilityLabel="User profile menu"
                  accessibilityHint="Tap to view profile options and sign out"
                >
                  <View style={styles.profileIcon}>
                    <Text style={styles.profileIconText}>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 
                       user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Concise Welcome Message */}
            <View style={styles.welcomeMessageContainer}>
              {user && !user.isAnonymous && user.displayName ? (
                <Text style={styles.welcomeMessage}>Hello, {user.displayName.split(' ')[0]}!</Text>
              ) : (
                <Text style={styles.welcomeMessage}>Ready to get started?</Text>
              )}
            </View>
            
            {/* Main action buttons grouped together */}
            <View style={styles.actionButtonsContainer}>
              {/* Primary action */}
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton, isMobileWeb && styles.buttonMobile]} 
                onPress={handleScanPress}>
                <CameraIcon color={'#fff'} size={20} />
                <Text style={styles.buttonText}>Scan Items</Text>
              </TouchableOpacity>
              
              {/* Scans remaining and upgrade inline */}
              <View style={styles.scanInfoContainer}>
                <Text style={styles.scanInfoText}>
                  You have {usageData ? (usageData.limit - usageData.scansUsed) : 3} scans remaining.{' '}
                  {(!usageData || usageData.plan === 'free') && (
                    <Text style={styles.upgradeLink} onPress={handleUpgradePress}>
                      Upgrade
                    </Text>
                  )}
                </Text>
              </View>
              
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
        
        {/* Profile Dropdown Modal */}
        {user && !user.isAnonymous && (
          <Modal
            visible={showProfileDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowProfileDropdown(false)}
          >
            <TouchableOpacity 
              style={styles.profileDropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowProfileDropdown(false)}
            >
              <View style={styles.profileDropdownContainer}>
                <View style={styles.profileDropdown}>
                  {/* User Info */}
                  <View style={styles.dropdownUserInfo}>
                    <Text style={styles.dropdownUserName}>
                      {user.displayName || user.email?.split('@')[0] || 'User'}
                    </Text>
                    {user.email && (
                      <Text style={styles.dropdownUserEmail}>{user.email}</Text>
                    )}
                  </View>
                  
                  {/* Account Settings (placeholder for future) */}
                  <TouchableOpacity 
                    style={styles.dropdownItem}
                    onPress={() => {
                      setShowProfileDropdown(false);
                      // TODO: Navigate to account settings
                    }}
                  >
                    <Text style={styles.dropdownItemText}>Account Settings</Text>
                  </TouchableOpacity>
                  
                  {/* Sign Out */}
                  <TouchableOpacity 
                    style={[styles.dropdownItem, styles.dropdownItemDestructive]}
                    onPress={() => {
                      setShowProfileDropdown(false);
                      handleLogoutPress();
                    }}
                  >
                    <LogOut color="#ef4444" size={16} />
                    <Text style={styles.dropdownItemTextDestructive}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Simplified bottom section - show sign-in bubble for anonymous users */}
        {!isLoading && !isSigningOut && (user?.isAnonymous || !user) && (
          <View style={styles.bottomSection}>
            {/* Debug log: Track sign-in bubble rendering */}
            {console.log('[IntroScreen] 🔑 SIGN-IN BUBBLE DEBUG: Rendering sign-in bubble for anonymous user:', {
              userExists: !!user,
              userIsAnonymous: user?.isAnonymous,
              userDisplayName: user?.displayName || 'None',
              userEmail: user?.email || 'None'
            }) || null}
            <TouchableOpacity 
              style={[styles.signInBubble, isMobileWeb && styles.signInBubbleMobile]} 
              onPress={handleSignInPress}
              accessibilityRole="button"
              accessibilityLabel="Sign in with Google"
              accessibilityHint="Sign in using your Google account to save calculations and get unlimited scans">
              <LogIn color="#10b981" size={16} />
              <Text style={styles.signInBubbleText}>Sign In</Text>
            </TouchableOpacity>
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
    flexDirection: 'column',
    paddingTop: 20,
    padding: 16,
  },
  // New Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
    position: 'relative', // For absolute positioning of profile icon
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  profileIconContainer: {
    position: 'absolute',
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  profileIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Welcome message styles
  welcomeMessageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    textAlign: 'center',
  },
  // Action buttons group (Law of Proximity)
  actionButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    width: '80%',
    marginBottom: 16,
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
  // Scan info styles (inline with upgrade link)
  scanInfoContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  scanInfoText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeLink: {
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
    alignSelf: 'center', // Center the disclaimer
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
  // Profile dropdown styles
  profileDropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 80, // Adjust based on header height
    paddingRight: 16,
  },
  profileDropdownContainer: {
    // Container for positioning
  },
  profileDropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dropdownUserInfo: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 8,
  },
  dropdownUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  dropdownUserEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  dropdownItemDestructive: {
    marginTop: 4,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dropdownItemTextDestructive: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 8,
  },
  // Bottom section containing simple sign-in bubble for anonymous users
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  // Simple sign-in bubble for anonymous users
  signInBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  signInBubbleMobile: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  signInBubbleText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#10b981',
  },
});