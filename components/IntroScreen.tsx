import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera as CameraIcon,
  Pill,
  Syringe,
  LogIn,
  LogOut,
  Info,
  User,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';

import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';
import { useRouter } from 'expo-router';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants'; // env variables from app.config.js

interface IntroScreenProps {
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  resetFullForm: (
    startStep?:
      | 'dose'
      | 'medicationSource'
      | 'concentrationInput'
      | 'totalAmountInput'
      | 'reconstitution'
      | 'syringe'
      | 'finalResult',
  ) => void;
  setNavigatingFromIntro?: (value: boolean) => void;
}

export default function IntroScreen({
  setScreenStep,
  resetFullForm,
  setNavigatingFromIntro,
}: IntroScreenProps) {
  const { user, auth, logout, isSigningOut } = useAuth();
  const { disclaimerText, profile, isLoading } = useUserProfile();
  const { usageData } = useUsageTracking();
  const router = useRouter();

  /* =========================================================================
     LOGGING  (remove or guard with __DEV__ as needed)
  ========================================================================= */
  useEffect(() => {
    console.log('[IntroScreen] mounted');
    return () => console.log('[IntroScreen] unmounted');
  }, []);

  /* =========================================================================
     HANDLERS
  ========================================================================= */
  const handleSignInPress = useCallback(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('Google Sign-In OK:', result.user.uid);
      })
      .catch((error) => {
        console.error('Google Sign-In error:', error.code, error.message);
      });
  }, [auth]);

  const handleUpgradePress = useCallback(() => {
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
    console.log('[IntroScreen] Alert availability check:', typeof Alert?.alert);
    console.log('[IntroScreen] Platform info:', { isMobileWeb });
    
    try {
      console.log('[IntroScreen] Showing confirmation dialog...');
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              console.log('[IntroScreen] User cancelled logout');
            }
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
              } catch (e) {
                console.error('[IntroScreen] ❌ Logout error:', e);
                Alert.alert('Sign Out Failed', 'Please try again.');
              }
            },
          },
        ],
        { cancelable: true },
      );
      console.log('[IntroScreen] Alert.alert() called successfully');
    } catch (error) {
      console.error('[IntroScreen] ❌ Error showing alert dialog:', error);
      console.log('[IntroScreen] Alert failed, attempting direct logout confirmation...');
      /* Fallback for web */
      try {
        const confirmed = confirm?.('Sign out?');
        console.log('[IntroScreen] Fallback confirmation result:', confirmed);
        if (confirmed) {
          console.log('[IntroScreen] ========== USER CONFIRMED LOGOUT ==========');
          console.log('[IntroScreen] User confirmed logout via fallback, initiating...');
          console.log('[IntroScreen] Calling logout function...');
          await logout();
          console.log('[IntroScreen] ✅ Logout completed successfully');
        } else {
          console.log('[IntroScreen] User cancelled logout via fallback');
        }
      } catch (e) {
        console.error('[IntroScreen] ❌ Fallback logout error:', e);
      }
    }
  }, [logout, user, isMobileWeb]);

  /* Dev helper: auto-login if TEST_LOGIN flag set */
  useEffect(() => {
    const auto = Constants.expoConfig?.extra?.TEST_LOGIN === true;
    if (auto && user?.isAnonymous) handleSignInPress();
  }, [user, handleSignInPress]);

  /* =========================================================================
     NAV HANDLERS
  ========================================================================= */
  const handleScanPress = useCallback(() => {
    setNavigatingFromIntro?.(true);
    setScreenStep('scan');
  }, [setScreenStep, setNavigatingFromIntro]);

  const handleManualEntryPress = useCallback(() => {
    setNavigatingFromIntro?.(true);
    resetFullForm('dose');
    setScreenStep('manualEntry');
  }, [resetFullForm, setScreenStep, setNavigatingFromIntro]);

  /* =========================================================================
     RENDER
  ========================================================================= */
  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        {__DEV__ && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>
              Profile {profile ? '✓' : '✗'} | Loading {isLoading ? '✓' : '✗'} | Usage{' '}
              {usageData ? '✓' : '✗'}
            </Text>
          </View>
        )}

        {isLoading && !isSigningOut && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your profile…</Text>
          </View>
        )}

        {isSigningOut && (
          <View style={styles.signingOutContainer}>
            <View style={styles.signingOutCard}>
              <Text style={styles.signingOutTitle}>Signing Out</Text>
              <Text style={styles.signingOutText}>
                You've been signed out. We'll sign you in anonymously shortly.
              </Text>
            </View>
          </View>
        )}

        {!isLoading && !isSigningOut && (
          <>
            {/* ===================== MAIN CONTENT ===================== */}
            <View style={styles.content}>
              <View style={styles.welcomeContainer}>
                <Syringe color="#6ee7b7" size={64} style={styles.icon} />
                {user && !user.isAnonymous && user.displayName ? (
                  <Text style={styles.welcomeText}>
                    Hello, {user.displayName.split(' ')[0]}!
                  </Text>
                ) : (
                  <Text style={styles.welcomeText}>Ready to get started?</Text>
                )}
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, isMobileWeb && styles.buttonMobile]}
                  onPress={handleScanPress}
                >
                  <CameraIcon color="#fff" size={20} />
                  <Text style={styles.buttonText}>Scan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    isMobileWeb && styles.buttonMobile,
                  ]}
                  onPress={handleManualEntryPress}
                >
                  <Pill color="#fff" size={20} />
                  <Text style={styles.buttonText}>Manual</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.scanStatusContainer}>
                <Text style={styles.scanStatusText}>
                  You have{' '}
                  {usageData ? usageData.limit - usageData.scansUsed : 3} scans remaining.{' '}
                  {(!usageData || usageData.plan === 'free') && (
                    <Text style={styles.upgradeLink} onPress={handleUpgradePress}>
                      Upgrade
                    </Text>
                  )}
                </Text>
              </View>

              <View style={styles.disclaimerContainer}>
                <View style={styles.disclaimerIconContainer}>
                  <Info color="#856404" size={14} style={styles.disclaimerIcon} />
                  <Text style={styles.disclaimerText}>
                    {disclaimerText ||
                      'Always consult a licensed healthcare professional before administering any medication.'}
                  </Text>
                </View>
              </View>
            </View>

            {/* ===================== AUTH / PROFILE ===================== */}
            <View style={styles.bottomSection}>
              {(user?.isAnonymous || !user) && (
                <View style={styles.authSection}>
                  <Text style={styles.authPromptText}>
                    {!user
                      ? 'Signed out successfully. Sign in to save calculations and get unlimited scans'
                      : 'Sign in to save calculations and get unlimited scans'}
                  </Text>

                  <TouchableOpacity
                    style={[styles.signInButton, isMobileWeb && styles.signInButtonMobile]}
                    onPress={handleSignInPress}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in with Google"
                    accessibilityHint="Sign in to save calculations and get unlimited scans"
                  >
                    <LogIn color="#10b981" size={16} />
                    <Text style={styles.signInButtonText}>Sign In with Google</Text>
                  </TouchableOpacity>
                </View>
              )}

              {user && !user.isAnonymous && (
                <View style={styles.profileSection}>
                  <View style={styles.userInfoContainer}>
                    <View style={styles.userInfoRow}>
                      <User color="#3b82f6" size={18} />
                      <View style={styles.userInfoText}>
                        <Text style={styles.userDisplayName}>
                          {user.displayName ||
                            user.email?.split('@')[0] ||
                            'User'}
                        </Text>
                        {user.email && (
                          <Text style={styles.userEmail}>{user.email}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.signOutButton,
                      isMobileWeb && styles.signOutButtonMobile,
                    ]}
                    onPress={handleLogoutPress}
                    testID="sign-out-button"
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    accessibilityHint="Sign out of your account"
                  >
                    <LogOut color="#ef4444" size={16} />
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

/* =========================================================================
   STYLES
========================================================================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },

  /* Debug */
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,0,0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },

  /* Loading / signing-out */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  signingOutContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  signingOutCard: {
    backgroundColor: '#fff',
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

  /* Main content */
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
    padding: 16,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },

  /* Action buttons */
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 100,
    height: 100,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonMobile: {
    paddingVertical: 18,
    paddingHorizontal: 18,
    width: 120,
    height: 120,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6366f1',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Scan status */
  scanStatusContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scanStatusText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  upgradeLink: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },

  /* Disclaimer */
  disclaimerContainer: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 32,
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
    fontStyle: 'italic',
    flex: 1,
  },

  /* Bottom / auth */
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 16,
  },

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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
});