import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera as CameraIcon,
  Pill,
  Syringe,
  LogIn,
  LogOut,
  Info,
  User,
  RotateCcw,
} from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';

import { useAuth } from '../contexts/AuthContext';
import { useUserProfile } from '../contexts/UserProfileContext';
import { useUsageTracking } from '../lib/hooks/useUsageTracking';
import { useDoseLogging } from '../lib/hooks/useDoseLogging';
import { useRouter, useFocusEffect } from 'expo-router';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Constants from 'expo-constants'; // env variables from app.config.js
import ConfirmationModal from './ConfirmationModal';

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
  const { getMostRecentDose } = useDoseLogging();
  const router = useRouter();

  // State for logout functionality
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showWebLogoutModal, setShowWebLogoutModal] = useState(false);
  const [hasRecentDose, setHasRecentDose] = useState(false);

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
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    console.log('[IntroScreen] ========== LOGOUT BUTTON PRESSED ==========');
    console.log('[IntroScreen] Current user state:', user ? {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email
    } : 'No user');
    console.log('[IntroScreen] Platform info:', { 
      platform: Platform.OS,
      isMobileWeb 
    });
    
    try {
      if (Platform.OS === 'web') {
        console.log('[IntroScreen] Using web confirmation modal');
        setShowWebLogoutModal(true);
      } else {
        console.log('[IntroScreen] Using native Alert.alert');
        Alert.alert(
          'Sign Out',
          'Are you sure you want to sign out?',
          [
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => {
                console.log('[IntroScreen] Alert cancelled');
                setIsLoggingOut(false);
              }
            },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                console.log('[IntroScreen] ========== USER CONFIRMED LOGOUT ==========');
                console.log('[IntroScreen] Alert Sign Out confirmed');
                try {
                  await logout();
                  console.log('[IntroScreen] Logout completed successfully');
                } catch (e) {
                  console.error('[IntroScreen] Logout failed:', e);
                  Alert.alert('Sign Out Failed', 'Please try again.');
                } finally {
                  setIsLoggingOut(false);
                }
              },
            },
          ],
          { 
            cancelable: true, 
            onDismiss: () => {
              console.log('[IntroScreen] Alert dismissed');
              setIsLoggingOut(false);
            }
          }
        );
        console.log('[IntroScreen] Alert.alert() called successfully');
      }
    } catch (error) {
      console.error('[IntroScreen] Dialog error:', error);
      setIsLoggingOut(false);
    }
  }, [logout, user, isLoggingOut, isMobileWeb]);

  // Handler for web logout modal confirmation
  const handleWebLogoutConfirm = useCallback(async () => {
    console.log('[IntroScreen] ========== USER CONFIRMED LOGOUT ==========');
    console.log('[IntroScreen] Web modal confirm accepted');
    setShowWebLogoutModal(false);
    try {
      await logout();
      console.log('[IntroScreen] Logout completed successfully');
    } catch (e) {
      console.error('[IntroScreen] Logout failed:', e);
      // Note: We can't use Alert.alert here on web, so we'll just log the error
      console.error('[IntroScreen] Web logout error - user may need to refresh');
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  // Handler for web logout modal cancellation
  const handleWebLogoutCancel = useCallback(() => {
    console.log('[IntroScreen] Web modal confirm cancelled');
    setShowWebLogoutModal(false);
    setIsLoggingOut(false);
  }, []);

  /* Dev helper: auto-login if TEST_LOGIN flag set */
  useEffect(() => {
    const auto = Constants.expoConfig?.extra?.TEST_LOGIN === true;
    if (auto && user?.isAnonymous) handleSignInPress();
  }, [user, handleSignInPress]);

  /* Check if user has recent dose logs for "Use Last Dose" button */
  const checkForRecentDose = useCallback(async () => {
    try {
      const recentDose = await getMostRecentDose();
      console.log('[IntroScreen] Recent dose check result:', !!recentDose, 'User:', user?.uid || 'anonymous');
      setHasRecentDose(!!recentDose);
    } catch (error) {
      console.error('[IntroScreen] Error checking for recent dose:', error);
      setHasRecentDose(false);
    }
  }, [getMostRecentDose, user?.uid]);

  useEffect(() => {
    checkForRecentDose();
  }, [checkForRecentDose]);

  /* Re-check for recent dose when screen becomes focused or user changes */
  useFocusEffect(
    React.useCallback(() => {
      checkForRecentDose();
    }, [checkForRecentDose])
  );

  /* =========================================================================
     NAV HANDLERS
  ========================================================================= */
  const handleScanPress = useCallback(async () => {
    // Check if user has remaining scans
    const scansRemaining = usageData ? usageData.limit - usageData.scansUsed : 3;
    
    if (scansRemaining <= 0) {
      // If no scans remaining, redirect to pricing page
      router.push('/pricing');
      return;
    }
    
    setNavigatingFromIntro?.(true);
    setScreenStep('scan');
  }, [setScreenStep, setNavigatingFromIntro, usageData, router]);

  const handleManualEntryPress = useCallback(() => {
    setNavigatingFromIntro?.(true);
    resetFullForm('dose');
    setScreenStep('manualEntry');
  }, [resetFullForm, setScreenStep, setNavigatingFromIntro]);

  const handleUseLastDosePress = useCallback(async () => {
    try {
      const recentDose = await getMostRecentDose();
      if (!recentDose) {
        console.warn('[IntroScreen] No recent dose found');
        return;
      }

      console.log('[IntroScreen] Using last dose for complete recreation:', recentDose);
      
      // Navigate to new-dose screen with comprehensive prefill parameters
      const prefillParams = new URLSearchParams({
        useLastDose: 'true',
        isLastDoseFlow: 'true', // Add flag to indicate this is a special flow
        // Basic dose information
        lastDoseValue: recentDose.doseValue.toString(),
        lastDoseUnit: recentDose.unit,
        lastSubstance: recentDose.substanceName || '',
        lastCalculatedVolume: recentDose.calculatedVolume.toString(),
        lastRecommendedMarking: recentDose.recommendedMarking || '',
      });

      // Add syringe information
      if (recentDose.syringeType) {
        prefillParams.set('lastSyringeType', recentDose.syringeType);
      }
      if (recentDose.syringeVolume) {
        prefillParams.set('lastSyringeVolume', recentDose.syringeVolume);
      }

      // Add medication source information
      if (recentDose.medicationInputType) {
        prefillParams.set('lastMedicationInputType', recentDose.medicationInputType);
      }
      if (recentDose.concentrationAmount) {
        prefillParams.set('lastConcentrationAmount', recentDose.concentrationAmount);
      }
      if (recentDose.concentrationUnit) {
        prefillParams.set('lastConcentrationUnit', recentDose.concentrationUnit);
      }
      if (recentDose.totalAmount) {
        prefillParams.set('lastTotalAmount', recentDose.totalAmount);
      }
      if (recentDose.solutionVolume) {
        prefillParams.set('lastSolutionVolume', recentDose.solutionVolume);
      }
      if (recentDose.calculatedConcentration) {
        prefillParams.set('lastCalculatedConcentration', recentDose.calculatedConcentration.toString());
      }

      console.log('[IntroScreen] Navigating to new-dose with complete last dose params:', Object.fromEntries(prefillParams));
      router.push(`/(tabs)/new-dose?${prefillParams.toString()}`);
    } catch (error) {
      console.error('[IntroScreen] Error using last dose:', error);
    }
  }, [getMostRecentDose, router]);

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
            <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
              <View style={[styles.welcomeContainer, isMobileWeb && styles.welcomeContainerMobile]}>
                <Syringe color="#6ee7b7" size={64} style={[styles.icon, isMobileWeb && styles.iconMobile]} />
                {user && !user.isAnonymous && user.displayName ? (
                  <Text style={styles.welcomeText}>
                    Hello, {user.displayName.split(' ')[0]}!
                  </Text>
                ) : (
                  <Text style={styles.welcomeText}>Ready to get started?</Text>
                )}
              </View>

              {/* Use Last Dose button - only show if user has previous dose */}
              {hasRecentDose && (
                <View style={styles.lastDoseContainer}>
                  <TouchableOpacity
                    style={[styles.lastDoseButton, isMobileWeb && styles.lastDoseButtonMobile]}
                    onPress={handleUseLastDosePress}
                    accessibilityRole="button"
                    accessibilityLabel="Use Last Dose"
                    accessibilityHint="Repeat your most recent dose with the same settings"
                  >
                    <RotateCcw color="#10b981" size={16} />
                    <Text style={styles.lastDoseButtonText}>Use Last Dose</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.actionButtonsContainer, isMobileWeb && styles.actionButtonsContainerMobile]}>
                {(() => {
                  const scansRemaining = usageData ? usageData.limit - usageData.scansUsed : 3;
                  const isOutOfScans = scansRemaining <= 0;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.button, 
                        isOutOfScans ? styles.outOfScansButton : styles.primaryButton, 
                        isMobileWeb && styles.buttonMobile
                      ]}
                      onPress={handleScanPress}
                    >
                      <CameraIcon color="#fff" size={20} />
                      <Text style={styles.buttonText}>
                        {isOutOfScans ? 'Upgrade' : 'Scan'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}

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

              {/* Plan Reconstitution Link */}
              <TouchableOpacity 
                style={styles.reconstitutionLinkContainer}
                onPress={() => router.push('/reconstitution')}
                accessibilityRole="button"
                accessibilityLabel="Plan Reconstitution"
                accessibilityHint="Calculate how much bacteriostatic water to use and how much to draw"
              >
                <Text style={styles.reconstitutionLinkText}>Plan Reconstitution</Text>
              </TouchableOpacity>

              <View style={styles.scanStatusContainer}>
                <Text style={styles.scanStatusText}>
                  {(() => {
                    const scansRemaining = usageData ? usageData.limit - usageData.scansUsed : 3;
                    if (scansRemaining <= 0) {
                      return "You've used all your scans";
                    }
                    return `You have ${scansRemaining} scans remaining.`;
                  })()}{' '}
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
                      ? 'Signed out successfully. Sign in to get more scans'
                      : 'Sign in to get more scans'}
                  </Text>

                  <TouchableOpacity
                    style={[styles.signInButton, isMobileWeb && styles.signInButtonMobile]}
                    onPress={handleSignInPress}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in with Google"
                    accessibilityHint="Sign in to get more scans"
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
                      isLoggingOut && styles.signOutButtonDisabled,
                    ]}
                    onPress={handleLogoutPress}
                    disabled={isLoggingOut}
                    testID="sign-out-button"
                    accessibilityRole="button"
                    accessibilityLabel="Sign out"
                    accessibilityHint="Sign out of your account"
                  >
                    <LogOut color="#ef4444" size={16} />
                    <Text style={styles.signOutButtonText}>
                      {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* Web Logout Confirmation Modal */}
        {Platform.OS === 'web' && (
          <ConfirmationModal
            visible={showWebLogoutModal}
            title="Sign Out"
            message="Are you sure you want to sign out?"
            onConfirm={handleWebLogoutConfirm}
            onCancel={handleWebLogoutCancel}
          />
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
  contentMobile: {
    paddingTop: 16, // Reduced top padding for small screens
    padding: 12, // Reduced general padding
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeContainerMobile: {
    marginBottom: 16, // Reduced margin for small screens
  },
  icon: {
    marginBottom: 15,
  },
  iconMobile: {
    marginBottom: 10, // Smaller margin for small screens
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },

  /* Use Last Dose button */
  lastDoseContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  lastDoseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  lastDoseButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  lastDoseButtonText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#10b981',
  },

  /* Action buttons */
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 20,
  },
  actionButtonsContainerMobile: {
    marginBottom: 20, // Reduced margin for small screens
    gap: 16, // Smaller gap between buttons
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
    paddingVertical: 12, // Reduced padding for small screens
    paddingHorizontal: 12, // Reduced padding for small screens
    width: 90, // Smaller width for small screens
    height: 90, // Smaller height for small screens
    gap: 6, // Smaller gap between icon and text
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  outOfScansButton: {
    backgroundColor: '#f59e0b', // Orange color to indicate upgrade needed
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

  /* Reconstitution Link */
  reconstitutionLinkContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 4,
  },
  reconstitutionLinkText: {
    fontSize: 14,
    color: '#6B7280', // Muted gray color
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '400',
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
  signOutButtonDisabled: {
    opacity: 0.5,
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 8,
    color: '#ef4444',
  },
});