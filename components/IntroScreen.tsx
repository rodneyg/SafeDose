import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  applyLastDose?: () => Promise<boolean>;
  onScanPress?: () => void;
}

export default function IntroScreen({
  setScreenStep,
  resetFullForm,
  setNavigatingFromIntro,
  applyLastDose,
  onScanPress,
}: IntroScreenProps) {
  const { user, auth, logout, isSigningOut } = useAuth();
  const { disclaimerText, profile, isLoading } = useUserProfile();
  const { usageData } = useUsageTracking();
  const { getDoseLogHistory } = useDoseLogging();
  const router = useRouter();

  // State for logout functionality
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showWebLogoutModal, setShowWebLogoutModal] = useState(false);
  
  // State for last dose functionality
  const [hasLastDose, setHasLastDose] = useState(false);
  const [isLoadingLastDose, setIsLoadingLastDose] = useState(false);

  /* =========================================================================
     LOGGING  (remove or guard with __DEV__ as needed)
  ========================================================================= */
  useEffect(() => {
    console.log('[IntroScreen] mounted');
    return () => console.log('[IntroScreen] unmounted');
  }, []);

  /* =========================================================================
     LAST DOSE AVAILABILITY CHECK
  ========================================================================= */
  const checkLastDoseAvailability = useCallback(async () => {
    try {
      console.log('[IntroScreen] Checking last dose availability...');
      console.log('[IntroScreen] Current user:', user ? { uid: user.uid, isAnonymous: user.isAnonymous } : 'No user');
      
      // First check if onboarding is complete - only show "Use Last Dose" if onboarding is done
      // This prevents the scenario where users have dose history but get redirected to onboarding
      const onboardingComplete = await AsyncStorage.getItem('onboardingComplete');
      console.log('[IntroScreen] Onboarding complete status:', onboardingComplete);
      
      if (onboardingComplete !== 'true') {
        console.log('[IntroScreen] Onboarding not complete, hiding Use Last Dose button');
        setHasLastDose(false);
        return;
      }
      
      const doseHistory = await getDoseLogHistory();
      console.log('[IntroScreen] Dose history length:', doseHistory.length);
      
      // Debug: Log first few entries if they exist
      if (doseHistory.length > 0) {
        console.log('[IntroScreen] First dose log:', {
          substanceName: doseHistory[0].substanceName,
          doseValue: doseHistory[0].doseValue,
          unit: doseHistory[0].unit,
          calculatedVolume: doseHistory[0].calculatedVolume,
          timestamp: doseHistory[0].timestamp,
          hasSubstanceName: !!doseHistory[0].substanceName,
          hasDoseValue: !!doseHistory[0].doseValue,
          hasUnit: !!doseHistory[0].unit,
          hasCalculatedVolume: !!doseHistory[0].calculatedVolume,
        });
      }
      
      // Check if we have at least one complete dose log
      // Relaxed validation - just need doseValue and calculatedVolume to show the button
      // This allows for cases where substanceName might be empty but we still have usable dose data
      const hasValidLastDose = doseHistory.length > 0 && 
        doseHistory[0].doseValue && 
        doseHistory[0].calculatedVolume;
      
      console.log('[IntroScreen] Has valid last dose:', hasValidLastDose);
      if (hasValidLastDose) {
        console.log('[IntroScreen] Last dose details:', {
          substance: doseHistory[0].substanceName || '(no name)',
          dose: doseHistory[0].doseValue,
          unit: doseHistory[0].unit || '(no unit)',
          volume: doseHistory[0].calculatedVolume,
          timestamp: doseHistory[0].timestamp
        });
      }
      
      setHasLastDose(!!hasValidLastDose);
    } catch (error) {
      console.error('[IntroScreen] Error checking last dose:', error);
      setHasLastDose(false);
    }
  }, [getDoseLogHistory, user]);

  // Check for last dose on mount and when user changes
  useEffect(() => {
    checkLastDoseAvailability();
  }, [checkLastDoseAvailability, user?.uid]);

  // Re-check when screen comes into focus (e.g., after completing a dose)
  useFocusEffect(
    useCallback(() => {
      console.log('[IntroScreen] Screen focused, re-checking last dose availability...');
      checkLastDoseAvailability();
    }, [checkLastDoseAvailability])
  );

  /* =========================================================================
     HANDLERS
  ========================================================================= */
  const handleSignInPress = useCallback(() => {
    console.log('[IntroScreen] ========== SIGN-IN INITIATED ==========');
    console.log('[IntroScreen] Current user before sign-in:', user ? {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName
    } : 'No user');
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    signInWithPopup(auth, provider)
      .then((result) => {
        console.log('[IntroScreen] ✅ Google Sign-In successful:', {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          isAnonymous: result.user.isAnonymous
        });
        console.log('[IntroScreen] AuthContext should update automatically via onAuthStateChanged');
      })
      .catch((error) => {
        console.error('[IntroScreen] ❌ Google Sign-In error:', error.code, error.message);
        console.error('[IntroScreen] Sign-in error details:', {
          code: error.code,
          message: error.message,
          name: error.name
        });
      });
  }, [auth, user]);



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
    // TODO: Fix Constants API usage
    // const auto = Constants.expoConfig?.extra?.TEST_LOGIN === true;
    // if (auto && user?.isAnonymous) handleSignInPress();
  }, [user, handleSignInPress]);

  /* =========================================================================
     NAV HANDLERS
  ========================================================================= */
  const handleScanPress = useCallback(async () => {
    // Check if user has remaining scans
    const scansRemaining = usageData ? usageData.limit - usageData.scansUsed : 3;
    
    if (scansRemaining <= 0 && user?.isAnonymous) {
      // If anonymous user is out of scans, encourage sign in
      Alert.alert(
        'Sign In to Continue',
        'You\'ve used your free scans. Sign in to continue using SafeDose.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setNavigatingFromIntro?.(true);
    
    // Use custom scan handler if provided, otherwise default behavior
    if (onScanPress) {
      onScanPress();
    } else {
      setScreenStep('scan');
    }
  }, [setScreenStep, setNavigatingFromIntro, usageData, router, onScanPress]);

  const handleManualEntryPress = useCallback(() => {
    setNavigatingFromIntro?.(true);
    resetFullForm('dose');
    setScreenStep('manualEntry');
  }, [resetFullForm, setScreenStep, setNavigatingFromIntro]);

  const handleUseLastDosePress = useCallback(async () => {
    if (!applyLastDose || isLoadingLastDose) return;
    
    console.log('[IntroScreen] ========== USE LAST DOSE BUTTON PRESSED ==========');
    setIsLoadingLastDose(true);
    setNavigatingFromIntro?.(true);
    
    try {
      console.log('[IntroScreen] Calling applyLastDose...');
      const success = await applyLastDose();
      console.log('[IntroScreen] Apply last dose result:', success);
      
      if (success) {
        console.log('[IntroScreen] ========== SUCCESS - NAVIGATING TO MANUAL ENTRY ==========');
        // Add a longer delay to ensure all state updates from applyLastDose are processed
        setTimeout(() => {
          setScreenStep('manualEntry');
          console.log('[IntroScreen] Screen step set to manualEntry after delay');
        }, 250);
      } else {
        console.log('[IntroScreen] ========== FAILURE - USING MANUAL ENTRY WITHOUT RESET ==========');
        // If applying last dose failed, just go to manual entry without resetting
        // This preserves any partial state that might have been set
        setScreenStep('manualEntry');
        console.log('[IntroScreen] Set screen step to manualEntry without reset');
      }
    } catch (error) {
      console.error('[IntroScreen] ========== ERROR - USING MANUAL ENTRY WITHOUT RESET ==========');
      console.error('[IntroScreen] Error applying last dose:', error);
      // On error, just go to manual entry without resetting
      // This preserves any partial state that might have been set
      setScreenStep('manualEntry');
      console.log('[IntroScreen] Set screen step to manualEntry without reset after error');
    } finally {
      setIsLoadingLastDose(false);
      console.log('[IntroScreen] ========== USE LAST DOSE FLOW COMPLETE ==========');
    }
  }, [applyLastDose, setScreenStep, setNavigatingFromIntro, isLoadingLastDose]);

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
                        Scan
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

                {hasLastDose && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.tertiaryButton,
                      isMobileWeb && styles.buttonMobile,
                      isLoadingLastDose && styles.buttonDisabled,
                    ]}
                    onPress={handleUseLastDosePress}
                    disabled={isLoadingLastDose}
                    accessibilityRole="button"
                    accessibilityLabel="Use Last Dose"
                    accessibilityHint="Prefill form with values from your most recent dose"
                  >
                    <RotateCcw color="#fff" size={20} />
                    <Text style={styles.buttonText}>
                      {isLoadingLastDose ? 'Loading...' : 'Use Last'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Use Last Dose Hint */}
              {hasLastDose && (
                <View style={styles.useLastDoseHintContainer}>
                  <Text style={styles.useLastDoseHintText}>
                    💡 "Use Last" prefills your most recent dose settings
                  </Text>
                </View>
              )}

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
                  })()}
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

  /* Action buttons */
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16, // Reduced gap to accommodate 3 buttons
    flexWrap: 'wrap', // Allow wrapping on very small screens
  },
  actionButtonsContainerMobile: {
    marginBottom: 20, // Reduced margin for small screens
    gap: 12, // Smaller gap between buttons for 3 buttons
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 90, // Slightly smaller to fit 3 buttons
    height: 90, // Slightly smaller to fit 3 buttons
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
    width: 80, // Smaller width for small screens with 3 buttons
    height: 80, // Smaller height for small screens with 3 buttons
    gap: 6, // Smaller gap between icon and text
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  outOfScansButton: {
    backgroundColor: '#8E8E93', // Gray color to indicate disabled
  },
  secondaryButton: {
    backgroundColor: '#6366f1',
  },
  tertiaryButton: {
    backgroundColor: '#10b981',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Use Last Dose Hint */
  useLastDoseHintContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  useLastDoseHintText: {
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center',
    fontStyle: 'italic',
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