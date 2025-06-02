import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  const { user, auth, logout } = useAuth();
  const { disclaimerText } = useUserProfile();
  const { usageData } = useUsageTracking();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Log component mount to help debug visibility issues
  useEffect(() => {
    console.log('[IntroScreen] Component mounted');
    
    // Force log to make sure this component actually renders
    console.log('[IntroScreen] Currently visible, screenStep should be "intro"');
    
    return () => {
      console.log('[IntroScreen] Component unmounted');
    };
  }, []);

  // Use memoized handlers to ensure stable references across renders
  const handleSignInPress = useCallback(() => {
    console.log('[IntroScreen] Sign In button pressed');
    const provider = new GoogleAuthProvider();
    
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
        // Navigate to the main app screen after successful authentication
        router.replace('/(tabs)/new-dose');
      })
      .catch((error) => {
        console.error('Google sign-in error:', error);
      });
  }, [auth, user, router]);

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
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      {/* Invisible overlay to close menu when tapping outside */}
      {isProfileMenuOpen && (
        <TouchableOpacity 
          style={styles.menuOverlay} 
          onPress={() => setIsProfileMenuOpen(false)}
          activeOpacity={1}
        />
      )}
      


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
      
      {/* Disclaimer with Info icon */}
      <View style={styles.disclaimerContainer}>
        <View style={styles.disclaimerIconContainer}>
          <Info color={'#856404'} size={14} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            {disclaimerText}
          </Text>
        </View>
      </View>
      
      {/* Upgrade Plan - Low-Visual-Weight Footer Element (Law of Visual Hierarchy) */}
      {(usageData.plan === 'free') && (
        <View style={styles.upgradeContainer}>
          <TouchableOpacity 
            style={[styles.upgradeButton, isMobileWeb && styles.upgradeButtonMobile]} 
            onPress={handleUpgradePress}>
            <CreditCard color={'#f59e0b'} size={16} />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Auth Section */}
      <View style={styles.bottomSection}>
        {user?.isAnonymous ? (
          // Auth section for anonymous users
          <View style={styles.authSection}>
            <Text style={styles.authPromptText}>
              Sign in to save calculations and get unlimited scans
            </Text>
            <TouchableOpacity 
              style={[styles.signInButton, isMobileWeb && styles.signInButtonMobile]} 
              onPress={toggleProfileMenu}>
              <LogIn color="#10b981" size={18} />
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>
            
            {/* Auth dropdown menu */}
            {isProfileMenuOpen && (
              <View style={styles.authMenu}>
                <TouchableOpacity 
                  style={styles.signInMenuItem}
                  onPress={() => {
                    setIsProfileMenuOpen(false);
                    handleSignInPress();
                  }}>
                  <LogIn color="#10b981" size={16} />
                  <Text style={styles.signInMenuText}>Sign In with Google</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // Profile section for signed-in users
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={[styles.profileButton, isMobileWeb && styles.profileButtonMobile]} 
              onPress={toggleProfileMenu}>
              <User color="#3b82f6" size={18} />
              <Text style={styles.profileText}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { 
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center', 
    padding: 16,
    position: 'relative', // To support absolute positioning of profile button
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
  signInMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signInMenuText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    color: '#10b981',
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
  // Bottom section for auth UI
  bottomSection: {
    position: 'absolute',
    bottom: 100, // Increased spacing above the upgrade button
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  // Auth section for anonymous users
  authSection: {
    alignItems: 'center',
    width: '100%',
  },
  authPromptText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    lineHeight: 20, // Better line spacing for readability
    flexWrap: 'wrap', // Ensure text wraps on small screens
  },
  // Profile section for signed-in users
  profileSection: {
    alignItems: 'center',
    width: '100%',
  },
  // Sign In button (green border, pill shape)
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Pill shape
    borderWidth: 2,
    borderColor: '#10b981', // Green border
    minWidth: 120,
  },
  signInButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#10b981',
  },
  // Profile button for signed-in users
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // Pill shape
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 120,
  },
  profileButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  profileText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    color: '#334155',
  },
  // Auth menu dropdown for anonymous users
  authMenu: {
    position: 'absolute',
    bottom: 60, // Above the button
    left: '50%',
    marginLeft: -90, // Half of minWidth to center
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
    zIndex: 15,
  },
  // Profile menu dropdown for signed-in users
  profileMenu: {
    position: 'absolute',
    bottom: 60, // Above the button
    left: '50%',
    marginLeft: -90, // Half of minWidth to center
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
    zIndex: 15,
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
  // Upgrade section (Law of Visual Hierarchy)
  upgradeContainer: {
    position: 'absolute',
    bottom: 20,
    alignItems: 'center',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  upgradeButtonMobile: {
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  upgradeText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});