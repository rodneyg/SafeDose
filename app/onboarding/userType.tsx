import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Check, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileAnswers, UserProfile } from '@/types/userProfile';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { isMobileWeb } from '@/lib/utils';
import { useOnboardingIntentStorage } from '@/lib/hooks/useOnboardingIntentStorage';

export default function UserTypeSegmentation() {
  const router = useRouter();
  const { user } = useAuth();
  const { saveProfile } = useUserProfile();
  const { submitOnboardingIntent } = useOnboardingIntentStorage();
  const { age, limitedFunctionality } = useLocalSearchParams<{ 
    age: string;
    limitedFunctionality: string;
    reason: string;
  }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<UserProfileAnswers>({
    isLicensedProfessional: null,
    isProfessionalAthlete: null,
    isPersonalUse: null,
    isCosmeticUse: null,
    isPerformanceUse: null,
    isRecoveryUse: null,
    age: age ? parseInt(age) : null,
    birthDate: null,
    followsProtocol: null,
  });

  // Log analytics when step starts
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_START, {
      step: currentStep + 1,
      step_name: getStepName(currentStep)
    });
  }, [currentStep]);

  const getStepName = (step: number): string => {
    switch (step) {
      case 0: return 'background';
      case 1: return 'use_type';
      case 2: return 'protocol_decision';
      case 3: return 'personal_use';
      default: return 'unknown';
    }
  };

  const handleAnswerChange = useCallback((question: keyof UserProfileAnswers, value: boolean) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [question]: value };
      
      // Handle mutual exclusivity for background questions
      if (question === 'isLicensedProfessional' && value === true) {
        newAnswers.isProfessionalAthlete = false;
      } else if (question === 'isProfessionalAthlete' && value === true) {
        newAnswers.isLicensedProfessional = false;
      }
      
      // Handle mutual exclusivity for use type questions
      if (question === 'isCosmeticUse' && value === true) {
        newAnswers.isPerformanceUse = false;
        newAnswers.isRecoveryUse = false;
      } else if (question === 'isPerformanceUse' && value === true) {
        newAnswers.isCosmeticUse = false;
        newAnswers.isRecoveryUse = false;
      } else if (question === 'isRecoveryUse' && value === true) {
        newAnswers.isCosmeticUse = false;
        newAnswers.isPerformanceUse = false;
      }
      
      return newAnswers;
    });
    
    // Log the answer
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETE, {
      step: currentStep + 1,
      step_name: getStepName(currentStep),
      question,
      answer: value
    });
  }, [currentStep]);

  const handleGeneralUserSelect = useCallback(() => {
    setAnswers(prev => ({
      ...prev,
      isLicensedProfessional: false,
      isProfessionalAthlete: false
    }));
    
    // Log the answer
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETE, {
      step: currentStep + 1,
      step_name: getStepName(currentStep),
      question: 'background_type',
      answer: 'general_user'
    });
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    // Log the skip
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_SKIP, {
      step: currentStep + 1,
      step_name: getStepName(currentStep)
    });
    
    if (currentStep === 3) {
      // For personal use question, set to null when skipped
      setAnswers(prev => ({ ...prev, isPersonalUse: null }));
    }
    
    // Move to next step or complete
    if (currentStep < 3) {
      // Special case: if user selected "I follow a protocol" in step 2, skip step 3 and go directly to completion
      if (currentStep === 2 && answers.followsProtocol === true) {
        console.log('[UserType] User selected protocol - skipping personal use step and completing directly');
        handleComplete();
        return;
      }
      
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, answers.followsProtocol, handleComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      // Special case: if user selected "I follow a protocol" in step 2, skip step 3 and go directly to completion
      if (currentStep === 2 && answers.followsProtocol === true) {
        console.log('[UserType] User selected protocol - skipping personal use step and completing directly');
        handleComplete();
        return;
      }
      
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, answers.followsProtocol, handleComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    try {
      console.log('[UserType] ========== ONBOARDING COMPLETION START ==========');
      console.log('[UserType] Current answers:', answers);
      console.log('[UserType] Current user:', user?.uid || 'No user');
      console.log('[UserType] followsProtocol value:', answers.followsProtocol);
      
      // Submit onboarding intent data (for analytics and data collection)
      // This happens first and independently of profile saving
      console.log('[UserType] Submitting onboarding intent data...');
      try {
        await submitOnboardingIntent(answers);
        console.log('[UserType] ✅ Onboarding intent data submitted');
      } catch (intentError) {
        console.warn('[UserType] ⚠️ Failed to submit onboarding intent data:', intentError);
        // Continue with onboarding even if intent submission fails
      }
      
      const profile: UserProfile = {
        isLicensedProfessional: answers.isLicensedProfessional ?? false,
        isProfessionalAthlete: answers.isProfessionalAthlete ?? false,
        isPersonalUse: answers.isPersonalUse ?? true, // Default to personal use if skipped
        isCosmeticUse: answers.isCosmeticUse ?? false,
        isPerformanceUse: answers.isPerformanceUse ?? false,
        isRecoveryUse: answers.isRecoveryUse ?? false,
        age: answers.age || undefined, // Include age if provided
        dateCreated: new Date().toISOString(),
        userId: user?.uid,
        followsProtocol: answers.followsProtocol ?? false,
        hasSetupProtocol: false, // Will be set to true after protocol setup
      };

      console.log('[UserType] Created profile object:', profile);
      console.log('[UserType] Starting profile save...');
      
      // Ensure profile is saved before navigation
      await saveProfile(profile);
      console.log('[UserType] ✅ Profile save completed');
      
      // CRITICAL: Set onboarding completion flag
      console.log('[UserType] Setting onboarding completion flag...');
      await AsyncStorage.setItem('onboardingComplete', 'true');
      console.log('[UserType] ✅ Onboarding completion flag set');
      
      // Log completion
      logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {
        isLicensedProfessional: profile.isLicensedProfessional,
        isProfessionalAthlete: profile.isProfessionalAthlete,
        isPersonalUse: profile.isPersonalUse,
        isCosmeticUse: profile.isCosmeticUse,
        isPerformanceUse: profile.isPerformanceUse,
        isRecoveryUse: profile.isRecoveryUse,
        followsProtocol: profile.followsProtocol,
        skipped_personal_use: answers.isPersonalUse === null,
        age: profile.age,
        age_range: profile.age ? (profile.age < 18 ? 'minor' : profile.age < 65 ? 'adult' : 'senior') : 'unknown'
      });
      console.log('[UserType] ✅ Analytics event logged');
      
      // Add a small delay to ensure profile is fully persisted before navigation
      console.log('[UserType] Adding 100ms delay for persistence...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check AsyncStorage state before navigation
      console.log('[UserType] Checking AsyncStorage state before navigation...');
      const [onboardingComplete, storedProfile] = await Promise.all([
        AsyncStorage.getItem('onboardingComplete'),
        AsyncStorage.getItem('userProfile')
      ]);
      
      console.log('[UserType] Pre-navigation AsyncStorage state:', {
        onboardingComplete,
        storedProfile: storedProfile ? 'exists' : 'null',
        storedProfileLength: storedProfile?.length,
        parsedProfile: storedProfile ? JSON.parse(storedProfile) : null
      });
      
      // Navigate based on whether user wants to set up a protocol
      if (answers.followsProtocol === true) {
        console.log('[UserType] 🚀 NAVIGATING TO PROTOCOL SETUP - user wants to follow a protocol');
        router.replace('/onboarding/protocol');
      } else {
        console.log('[UserType] 🚀 NAVIGATING DIRECTLY TO INTRO - user wants quick use mode');
        console.log('[UserType] ========== BYPASSING INDEX.TSX ROUTING ==========');
        router.replace('/(tabs)/new-dose');
      }
    } catch (error) {
      console.error('[UserType] ❌ ERROR during completion:', error);
      console.error('[UserType] Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.log('[UserType] 🚀 FALLBACK NAVIGATION - calling router.replace("/")');
      // Fallback navigation to root
      router.replace('/');
    }
  }, [answers, saveProfile, router, user?.uid, submitOnboardingIntent]);

  const isCurrentStepComplete = (): boolean => {
    switch (currentStep) {
      case 0: return answers.isLicensedProfessional !== null || answers.isProfessionalAthlete !== null;
      case 1: return answers.isCosmeticUse !== null || answers.isPerformanceUse !== null || answers.isRecoveryUse !== null;
      case 2: return answers.followsProtocol !== null;
      case 3: return true; // This step is always "complete" since it can be skipped
      default: return false;
    }
  };

  const renderBackgroundStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
      <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>What's your background?</Text>
      <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
        This helps us provide appropriate guidance for your experience level.
      </Text>
      
      <View style={[styles.optionsContainer, isMobileWeb && styles.optionsContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isLicensedProfessional === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isLicensedProfessional', true)}
          accessibilityRole="button"
          accessibilityLabel="Healthcare Professional"
        >
          {answers.isLicensedProfessional === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isLicensedProfessional === true && styles.optionTitleSelected,
          ]}>
            Healthcare Professional
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            Licensed healthcare provider, nurse, doctor, pharmacist, etc.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isProfessionalAthlete === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isProfessionalAthlete', true)}
          accessibilityRole="button"
          accessibilityLabel="Professional Athlete"
        >
          {answers.isProfessionalAthlete === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isProfessionalAthlete === true && styles.optionTitleSelected,
          ]}>
            Professional Athlete
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            Professional athlete requiring specialized medication guidance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            (answers.isLicensedProfessional === false && answers.isProfessionalAthlete === false) && styles.optionCardSelected,
          ]}
          onPress={handleGeneralUserSelect}
          accessibilityRole="button"
          accessibilityLabel="General User"
        >
          {(answers.isLicensedProfessional === false && answers.isProfessionalAthlete === false) && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            (answers.isLicensedProfessional === false && answers.isProfessionalAthlete === false) && styles.optionTitleSelected,
          ]}>
            General User
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            Patient, caregiver, or someone learning about medications
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderUseTypeStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
      <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>What type of use?</Text>
      <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
        This helps us show relevant safety information and disclaimers.
      </Text>
      
      <View style={[styles.optionsContainer, isMobileWeb && styles.optionsContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isCosmeticUse === false && answers.isPerformanceUse === false && answers.isRecoveryUse === false && styles.optionCardSelected,
          ]}
          onPress={() => {
            handleAnswerChange('isCosmeticUse', false);
            setAnswers(prev => ({ ...prev, isPerformanceUse: false, isRecoveryUse: false }));
          }}
          accessibilityRole="button"
          accessibilityLabel="Medical/Prescribed"
        >
          {answers.isCosmeticUse === false && answers.isPerformanceUse === false && answers.isRecoveryUse === false && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isCosmeticUse === false && answers.isPerformanceUse === false && answers.isRecoveryUse === false && styles.optionTitleSelected,
          ]}>
            Medical/Prescribed
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            Doctor-prescribed medications or medical treatments
          </Text>
        </TouchableOpacity>

        {/* Show Performance option for professional athletes and general users (not healthcare professionals) */}
        {answers.isLicensedProfessional !== true && (
          <TouchableOpacity
            style={[
              styles.optionCard,
              isMobileWeb && styles.optionCardMobile,
              answers.isPerformanceUse === true && styles.optionCardSelected,
            ]}
            onPress={() => handleAnswerChange('isPerformanceUse', true)}
            accessibilityRole="button"
            accessibilityLabel="Performance"
          >
            {answers.isPerformanceUse === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
            <Text style={[
              styles.optionTitle,
              isMobileWeb && styles.optionTitleMobile,
              answers.isPerformanceUse === true && styles.optionTitleSelected,
            ]}>
              Performance
            </Text>
            <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
              Performance enhancement and athletic optimization
            </Text>
          </TouchableOpacity>
        )}

        {/* Show Recovery option for professional athletes and general users (not healthcare professionals) */}
        {answers.isLicensedProfessional !== true && (
          <TouchableOpacity
            style={[
              styles.optionCard,
              isMobileWeb && styles.optionCardMobile,
              answers.isRecoveryUse === true && styles.optionCardSelected,
            ]}
            onPress={() => handleAnswerChange('isRecoveryUse', true)}
            accessibilityRole="button"
            accessibilityLabel="Recovery"
          >
            {answers.isRecoveryUse === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
            <Text style={[
              styles.optionTitle,
              isMobileWeb && styles.optionTitleMobile,
              answers.isRecoveryUse === true && styles.optionTitleSelected,
            ]}>
              Recovery
            </Text>
            <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
              Injury healing, tissue repair, and recovery optimization
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isCosmeticUse === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isCosmeticUse', true)}
          accessibilityRole="button"
          accessibilityLabel="Cosmetic/Aesthetic"
        >
          {answers.isCosmeticUse === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isCosmeticUse === true && styles.optionTitleSelected,
          ]}>
            Cosmetic/Aesthetic
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            Cosmetic injections or aesthetic treatments
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderProtocolDecisionStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
      <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>Are you following a protocol?</Text>
      <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
        This helps us determine whether to set up structured medication scheduling or provide quick one-off calculations.
      </Text>
      
      <View style={[styles.optionsContainer, isMobileWeb && styles.optionsContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.followsProtocol === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('followsProtocol', true)}
          accessibilityRole="button"
          accessibilityLabel="Yes, I follow a structured protocol"
        >
          {answers.followsProtocol === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.followsProtocol === true && styles.optionTitleSelected,
          ]}>
            Yes, I follow a protocol
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            I have a structured medication schedule (TRT, peptides, insulin, etc.)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.followsProtocol === false && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('followsProtocol', false)}
          accessibilityRole="button"
          accessibilityLabel="No, I need quick calculations"
        >
          {answers.followsProtocol === false && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.followsProtocol === false && styles.optionTitleSelected,
          ]}>
            No, quick calculations
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            I need one-off dose calculations and guidance
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderPersonalUseStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={[styles.stepContainer, isMobileWeb && styles.stepContainerMobile]}>
      <Text style={[styles.stepTitle, isMobileWeb && styles.stepTitleMobile]}>Who is this for?</Text>
      <Text style={[styles.stepDescription, isMobileWeb && styles.stepDescriptionMobile]}>
        This helps us customize warnings appropriately. You can skip this if you prefer.
      </Text>
      
      <View style={[styles.optionsContainer, isMobileWeb && styles.optionsContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isPersonalUse === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isPersonalUse', true)}
          accessibilityRole="button"
          accessibilityLabel="For myself"
        >
          {answers.isPersonalUse === true && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isPersonalUse === true && styles.optionTitleSelected,
          ]}>
            For myself
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            I'm using this for my own treatment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            isMobileWeb && styles.optionCardMobile,
            answers.isPersonalUse === false && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isPersonalUse', false)}
          accessibilityRole="button"
          accessibilityLabel="For someone else"
        >
          {answers.isPersonalUse === false && <Check size={isMobileWeb ? 20 : 24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            isMobileWeb && styles.optionTitleMobile,
            answers.isPersonalUse === false && styles.optionTitleSelected,
          ]}>
            For someone else
          </Text>
          <Text style={[styles.optionSubtitle, isMobileWeb && styles.optionSubtitleMobile]}>
            I'm helping prepare medication for another person
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip this question"
      >
        <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>Prefer not to answer</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderBackgroundStep();
      case 1: return renderUseTypeStep();
      case 2: return renderProtocolDecisionStep();
      case 3: return renderPersonalUseStep();
      default: return null;
    }
  };

  const getProgressWidth = () => {
    // If user selected protocol in step 2, we skip step 3, so total steps is 3 instead of 4
    const totalSteps = (currentStep >= 2 && answers.followsProtocol === true) ? 3 : 4;
    return ((currentStep + 1) / totalSteps) * 100;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, isMobileWeb && styles.scrollContentMobile]}>
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={[styles.header, isMobileWeb && styles.headerMobile]}>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Let's Personalize Your Experience</Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            Step {currentStep + 1} of {(currentStep >= 2 && answers.followsProtocol === true) ? 3 : 4}
          </Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[styles.progressBar, { width: `${getProgressWidth()}%` }]}
                entering={FadeInRight.duration(300)}
              />
            </View>
            <Text style={styles.progressLabel}>
              {Math.round(getProgressWidth())}% Complete
            </Text>
          </View>
        </Animated.View>

        {/* Limited Functionality Warning Banner */}
        {limitedFunctionality === 'true' && (
          <Animated.View entering={FadeIn.delay(200)} style={[styles.warningBanner, isMobileWeb && styles.warningBannerMobile]}>
            <View style={styles.warningIcon}>
              <AlertTriangle size={18} color="#D97706" />
            </View>
            <View style={styles.warningContent}>
              <Text style={[styles.warningTitle, isMobileWeb && styles.warningTitleMobile]}>
                Limited Functionality Active
              </Text>
              <Text style={[styles.warningText, isMobileWeb && styles.warningTextMobile]}>
                Some safety features are limited since birth date wasn't provided. Guidance will be more generic.
              </Text>
            </View>
          </Animated.View>
        )}

        {renderCurrentStep()}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400).duration(800)} style={[styles.footer, isMobileWeb && styles.footerMobile]}>
        <View style={[styles.buttonContainer, isMobileWeb && styles.buttonContainerMobile]}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={isMobileWeb ? 18 : 20} color="#007AFF" />
              <Text style={[styles.backButtonText, isMobileWeb && styles.backButtonTextMobile]}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              isMobileWeb && styles.nextButtonMobile,
              !isCurrentStepComplete() && currentStep !== 2 && styles.nextButtonDisabled
            ]}
            onPress={currentStep === 2 ? handleComplete : handleNext}
            disabled={!isCurrentStepComplete() && currentStep !== 2}
            accessibilityRole="button"
            accessibilityLabel={currentStep === 2 ? "Complete setup" : "Continue to next step"}
          >
            <Text style={[
              styles.nextButtonText,
              isMobileWeb && styles.nextButtonTextMobile,
              !isCurrentStepComplete() && currentStep !== 2 && styles.nextButtonTextDisabled
            ]}>
              {currentStep === 2 ? 'Complete' : 'Continue'}
            </Text>
            <ArrowRight size={isMobileWeb ? 18 : 20} color={!isCurrentStepComplete() && currentStep !== 2 ? "#A1A1AA" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.privacyText, isMobileWeb && styles.privacyTextMobile]}>
          Your answers help us provide appropriate safety guidance and are stored securely.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  // Warning banner styles
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 6,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: '85%',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  optionTitleSelected: {
    color: '#007AFF',
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  skipButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  footer: {
    padding: 20,
    paddingTop: 24,
    alignItems: 'center',
    gap: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'transparent',
    gap: 8,
  },
  backButtonText: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    gap: 8,
    minWidth: 160,
  },
  nextButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButtonTextDisabled: {
    color: '#A1A1AA',
  },
  privacyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
    marginBottom: 8,
  },
  // Mobile-specific styles
  scrollContentMobile: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  headerMobile: {
    marginBottom: 16,
  },
  // Mobile warning styles
  warningBannerMobile: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  warningTitleMobile: {
    fontSize: 15,
    marginBottom: 3,
  },
  warningTextMobile: {
    fontSize: 13,
    lineHeight: 18,
  },
  titleMobile: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitleMobile: {
    fontSize: 16,
    marginBottom: 8,
  },
  stepContainerMobile: {
    marginBottom: 16,
  },
  stepTitleMobile: {
    fontSize: 20,
    marginBottom: 8,
  },
  stepDescriptionMobile: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: '95%',
  },
  optionsContainerMobile: {
    gap: 12,
  },
  optionCardMobile: {
    padding: 14,
    minHeight: 80,
  },
  optionTitleMobile: {
    fontSize: 16,
    marginBottom: 6,
    marginTop: 6,
  },
  optionSubtitleMobile: {
    fontSize: 13,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  skipButtonMobile: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
  footerMobile: {
    padding: 16,
    paddingTop: 16,
    gap: 12,
  },
  buttonContainerMobile: {
    gap: 12,
  },
  backButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  backButtonTextMobile: {
    fontSize: 16,
  },
  nextButtonMobile: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    minWidth: 140,
  },
  nextButtonTextMobile: {
    fontSize: 16,
  },
  privacyTextMobile: {
    fontSize: 13,
    lineHeight: 16,
    maxWidth: '95%',
    marginBottom: 4,
  },
});