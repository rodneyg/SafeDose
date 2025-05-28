import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera as CameraIcon, Pill, Syringe, LogIn, LogOut, CreditCard, Info } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';
// Import auth-related dependencies for Sign In functionality
import { useAuth } from '../contexts/AuthContext';
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
  const router = useRouter();

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
    try {
      await logout();
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);

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
      <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
      
      {/* Dynamic welcome message based on authentication status */}
      {user && !user.isAnonymous && user.displayName ? (
        <Text style={styles.text}>Welcome back, {user.displayName}. Ready to scan?</Text>
      ) : (
        <Text style={styles.text}>Welcome! Calculate your dose accurately.</Text>
      )}
      
      {/* Disclaimer with Info icon */}
      <View style={styles.disclaimerContainer}>
        <View style={styles.disclaimerIconContainer}>
          <Info color={'#856404'} size={14} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            **Medical Disclaimer**: This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making any decisions regarding medication or treatment. Incorrect dosing can lead to serious health risks.
          </Text>
        </View>
      </View>
      
      {/* Authentication button - consistent position regardless of auth state */}
      {user?.isAnonymous ? (
        <TouchableOpacity 
          style={[styles.button, styles.signInButton, isMobileWeb && styles.buttonMobile]} 
          onPress={handleSignInPress}>
          <LogIn color={'#fff'} size={20} />
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.button, styles.logoutButton, isMobileWeb && styles.buttonMobile]} 
          onPress={handleLogoutPress}>
          <LogOut color={'#fff'} size={20} />
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      )}
      
      {/* Main action buttons */}
      <TouchableOpacity 
        style={[styles.button, isMobileWeb && styles.buttonMobile]} 
        onPress={handleScanPress}>
        <CameraIcon color={'#fff'} size={20} />
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.manualButton, isMobileWeb && styles.buttonMobile]}
        onPress={handleManualEntryPress}
      >
        <Pill color={'#fff'} size={20} />
        <Text style={styles.buttonText}>Enter Details Manually</Text>
      </TouchableOpacity>
      
      {/* Upgrade plan button - moved below main actions and only shown for anonymous users */}
      {user?.isAnonymous && (
        <TouchableOpacity 
          style={[styles.button, styles.upgradeButton, styles.upgradeButtonSmaller, isMobileWeb && styles.buttonMobile]} 
          onPress={handleUpgradePress}>
          <CreditCard color={'#fff'} size={18} />
          <Text style={styles.buttonText}>Upgrade Plan</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 16, // More consistent spacing between buttons
    padding: 20, 
    paddingTop: 10, // Reduced top padding to bring content closer to center
  },
  icon: { 
    marginBottom: 12, // Reduced margin to bring content closer together
  },
  text: { 
    fontSize: 16, 
    color: '#000000', 
    textAlign: 'center', 
    paddingHorizontal: 16,
    marginBottom: 4, // Add some space after the text
  },
  disclaimerContainer: { 
    backgroundColor: '#FFF3CD', 
    padding: 10, // Slightly reduced padding
    borderRadius: 8, 
    marginVertical: 8, 
    width: '90%', 
    alignSelf: 'center',
  },
  disclaimerIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  disclaimerText: { 
    fontSize: 11, // Slightly reduced font size
    color: '#856404', 
    textAlign: 'left', // Left-aligned for better readability with the icon
    fontStyle: 'italic',
    flex: 1,
  },
  button: { 
    backgroundColor: '#007AFF', 
    paddingVertical: 14, 
    paddingHorizontal: 28, 
    borderRadius: 10, // Consistent border radius
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, // Consistent spacing between icon and text
    width: '80%', 
    minHeight: 50 
  },
  buttonMobile: { 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    minHeight: 60 
  },
  manualButton: { 
    backgroundColor: '#6366f1' 
  },
  signInButton: { 
    backgroundColor: '#10b981' // Green color for sign in
  },
  upgradeButton: { 
    backgroundColor: '#f59e0b' // Amber color for upgrade
  },
  upgradeButtonSmaller: {
    width: '70%', // Smaller width for less prominence
    minHeight: 45, // Slightly smaller height
  },
  logoutButton: { 
    backgroundColor: '#ef4444' // Red color for logout
  },
  buttonText: { 
    color: '#f8fafc', 
    fontSize: 16, 
    fontWeight: '600', // Slightly increased font weight for better visibility
    textAlign: 'center' 
  },
});