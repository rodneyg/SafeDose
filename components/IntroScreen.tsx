import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera as CameraIcon, Pill, Syringe, LogIn, LogOut, CreditCard, Info, User, Mail } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';
// Import auth-related dependencies for Sign In functionality
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';
import { useRouter } from 'expo-router';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants'; // For accessing env variables from app.config.js
import * as Google from 'expo-auth-session/providers/google';

interface IntroScreenProps {
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  resetFullForm: (startStep?: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult') => void;
  setNavigatingFromIntro?: (value: boolean) => void;
}

export default function IntroScreen({ setScreenStep, resetFullForm, setNavigatingFromIntro }: IntroScreenProps) {
  console.log('[IntroScreen] ========== INTRO SCREEN RENDER ==========');
  
  const { user, auth, logout } = useAuth();
  const { disclaimerText, profile, isLoading } = useUserProfile();
  const { usageData } = useUsageTracking();
  const router = useRouter();
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
    usageData: {
      exists: !!usageData,
      scansUsed: usageData?.scansUsed || 'undefined',
      limit: usageData?.limit || 'undefined',
      plan: usageData?.plan || 'undefined'
    },
    isProfileMenuOpen
  });

  // Set up Google authentication
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: Constants.expoConfig?.extra?.googleAuth?.androidClientId,
    iosClientId: Constants.expoConfig?.extra?.googleAuth?.iosClientId,
    webClientId: Constants.expoConfig?.extra?.googleAuth?.webClientId,
  });

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken) {
        const credential = GoogleAuthProvider.credential(authentication.idToken);
        signInWithCredential(auth, credential)
          .then((result) => {
            console.log('Google Sign-In successful', result.user);
            if (user?.isAnonymous) {
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
          });
      }
    }
  }, [response, auth, user]);

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
    
    // Use the proper authentication method for the platform
    if (isMobileWeb) {
      // For web, we can use the popup method
      const provider = new GoogleAuthProvider();
      import('firebase/auth').then(({ signInWithPopup }) => {
        signInWithPopup(auth, provider)
          .then((result) => {
            console.log('Google Sign-In successful', result.user);
            if (user?.isAnonymous) {
              console.log('Linked anonymous account with Google');
            } else {
              console.log('Signed in with Google');
            }
            // Give the authentication state time to update
            setTimeout(() => {
              console.log('Web authentication successful, auth state should have updated');
            }, 100);
          })
          .catch((error) => {
            console.error('Google sign-in error:', error);
          });
      });
    } else {
      // For React Native, use the expo auth session
      promptAsync();
    }
  }, [auth, user, promptAsync]);

  const handleUpgradePress = useCallback(() => {
    console.log('[IntroScreen] Upgrade button pressed');
    // Navigate to pricing page for upgrade options
    router.push('/pricing');
  }, [router]);

  const handleLogoutPress = useCallback(async () => {
    console.log('[IntroScreen] Logout button pressed');
    setIsProfileMenuOpen(false);
    try {
      await logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);
  
  const toggleProfileMenu = useCallback(() => {
    // Always toggle the profile menu, regardless of authentication status
    setIsProfileMenuOpen(prevState => !prevState);
  }, []);

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
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your profile...</Text>
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
        
        {/* Main content section - only show when not loading */}
        {!isLoading && (
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
        
        {/* Bottom section with usage info, authentication and upgrade options - only show when not loading */}
        {!isLoading && (
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
            
            {/* Sign-In section - appears for anonymous users */}
            {user?.isAnonymous && (
              <View style={styles.authSection}>
                <Text style={styles.authPromptText}>
                  Sign in to save calculations and get unlimited scans
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
    justifyContent: 'center', 
    padding: 16,
  },
  // Welcome section
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: { 
    marginBottom: 12,
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
    marginBottom: 24,
  },
  button: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    width: '80%',
    marginBottom: 12,
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
    marginBottom: 16,
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
    paddingBottom: 20,
    alignItems: 'center',
    gap: 16,
  },
  // Usage Status Card - combines scans remaining with upgrade
  usageStatusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanCreditsText: { 
    color: '#333333', 
    fontSize: 14, 
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
    fontSize: 13,
    color: '#d97706',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18,
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
    position: 'relative',
  },
  authPromptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
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
    elevation: 4,
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
    elevation: 4,
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
  // Upgrade button
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
    width: '100%',
  },
  upgradeButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  upgradeText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});