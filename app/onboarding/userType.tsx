import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInRight, FadeInLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, X, ArrowRight, ArrowLeft } from 'lucide-react-native';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileAnswers, UserProfile } from '@/types/userProfile';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';

export default function UserTypeSegmentation() {
  const router = useRouter();
  const { user } = useAuth();
  const { saveProfile } = useUserProfile();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<UserProfileAnswers>({
    isLicensedProfessional: null,
    isPersonalUse: null,
    isCosmeticUse: null,
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
      case 2: return 'personal_use';
      default: return 'unknown';
    }
  };

  const handleAnswerChange = useCallback((question: keyof UserProfileAnswers, value: boolean) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
    
    // Log the answer
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_COMPLETE, {
      step: currentStep + 1,
      step_name: getStepName(currentStep),
      question,
      answer: value
    });
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    // Log the skip
    logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_STEP_SKIP, {
      step: currentStep + 1,
      step_name: getStepName(currentStep)
    });
    
    if (currentStep === 2) {
      // For personal use question, set to null when skipped
      setAnswers(prev => ({ ...prev, isPersonalUse: null }));
    }
    
    // Move to next step or complete
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    try {
      const profile: UserProfile = {
        isLicensedProfessional: answers.isLicensedProfessional ?? false,
        isPersonalUse: answers.isPersonalUse ?? true, // Default to personal use if skipped
        isCosmeticUse: answers.isCosmeticUse ?? false,
        dateCreated: new Date().toISOString(),
        userId: user?.uid,
      };

      // Ensure profile is saved before navigation
      await saveProfile(profile);
      
      // Log completion
      logAnalyticsEvent(ANALYTICS_EVENTS.ONBOARDING_COMPLETE, {
        isLicensedProfessional: profile.isLicensedProfessional,
        isPersonalUse: profile.isPersonalUse,
        isCosmeticUse: profile.isCosmeticUse,
        skipped_personal_use: answers.isPersonalUse === null
      });
      
      // Add a small delay to ensure profile is fully persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to root and let the app routing logic handle the proper destination
      // This avoids race conditions with the app/index.tsx routing logic
      router.replace('/');
    } catch (error) {
      console.error('Error saving user profile:', error);
      // Fallback navigation to root
      router.replace('/');
    }
  }, [answers, saveProfile, router, user?.uid]);

  const isCurrentStepComplete = (): boolean => {
    switch (currentStep) {
      case 0: return answers.isLicensedProfessional !== null;
      case 1: return answers.isCosmeticUse !== null;
      case 2: return true; // This step is always "complete" since it can be skipped
      default: return false;
    }
  };

  const renderBackgroundStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's your background?</Text>
      <Text style={styles.stepDescription}>
        This helps us provide appropriate guidance for your experience level.
      </Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isLicensedProfessional === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isLicensedProfessional', true)}
          accessibilityRole="button"
          accessibilityLabel="Healthcare Professional"
        >
          {answers.isLicensedProfessional === true && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isLicensedProfessional === true && styles.optionTitleSelected,
          ]}>
            Healthcare Professional
          </Text>
          <Text style={styles.optionSubtitle}>
            Licensed healthcare provider, nurse, doctor, pharmacist, etc.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isLicensedProfessional === false && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isLicensedProfessional', false)}
          accessibilityRole="button"
          accessibilityLabel="General User"
        >
          {answers.isLicensedProfessional === false && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isLicensedProfessional === false && styles.optionTitleSelected,
          ]}>
            General User
          </Text>
          <Text style={styles.optionSubtitle}>
            Patient, caregiver, or someone learning about medications
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderUseTypeStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What type of use?</Text>
      <Text style={styles.stepDescription}>
        This helps us show relevant safety information and disclaimers.
      </Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isCosmeticUse === false && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isCosmeticUse', false)}
          accessibilityRole="button"
          accessibilityLabel="Medical/Prescribed"
        >
          {answers.isCosmeticUse === false && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isCosmeticUse === false && styles.optionTitleSelected,
          ]}>
            Medical/Prescribed
          </Text>
          <Text style={styles.optionSubtitle}>
            Doctor-prescribed medications or medical treatments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isCosmeticUse === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isCosmeticUse', true)}
          accessibilityRole="button"
          accessibilityLabel="Cosmetic/Aesthetic"
        >
          {answers.isCosmeticUse === true && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isCosmeticUse === true && styles.optionTitleSelected,
          ]}>
            Cosmetic/Aesthetic
          </Text>
          <Text style={styles.optionSubtitle}>
            Cosmetic injections or aesthetic treatments
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderPersonalUseStep = () => (
    <Animated.View entering={FadeInRight.duration(500)} style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Who is this for?</Text>
      <Text style={styles.stepDescription}>
        This helps us customize warnings appropriately. You can skip this if you prefer.
      </Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isPersonalUse === true && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isPersonalUse', true)}
          accessibilityRole="button"
          accessibilityLabel="For myself"
        >
          {answers.isPersonalUse === true && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isPersonalUse === true && styles.optionTitleSelected,
          ]}>
            For myself
          </Text>
          <Text style={styles.optionSubtitle}>
            I'm using this for my own treatment
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            answers.isPersonalUse === false && styles.optionCardSelected,
          ]}
          onPress={() => handleAnswerChange('isPersonalUse', false)}
          accessibilityRole="button"
          accessibilityLabel="For someone else"
        >
          {answers.isPersonalUse === false && <Check size={24} color="#007AFF" />}
          <Text style={[
            styles.optionTitle,
            answers.isPersonalUse === false && styles.optionTitleSelected,
          ]}>
            For someone else
          </Text>
          <Text style={styles.optionSubtitle}>
            I'm helping prepare medication for another person
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip this question"
      >
        <Text style={styles.skipButtonText}>Prefer not to answer</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderBackgroundStep();
      case 1: return renderUseTypeStep();
      case 2: return renderPersonalUseStep();
      default: return null;
    }
  };

  const getProgressWidth = () => {
    return ((currentStep + 1) / 3) * 100;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.header}>
          <Text style={styles.title}>Let's Personalize Your Experience</Text>
          <Text style={styles.subtitle}>
            Step {currentStep + 1} of 3
          </Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <Animated.View 
                style={[styles.progressBar, { width: `${getProgressWidth()}%` }]}
                entering={FadeInRight.duration(300)}
              />
            </View>
          </View>
        </Animated.View>

        {renderCurrentStep()}
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.footer}>
        <View style={styles.buttonContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={20} color="#007AFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.nextButton,
              !isCurrentStepComplete() && currentStep !== 2 && styles.nextButtonDisabled
            ]}
            onPress={currentStep === 2 ? handleComplete : handleNext}
            disabled={!isCurrentStepComplete() && currentStep !== 2}
            accessibilityRole="button"
            accessibilityLabel={currentStep === 2 ? "Complete setup" : "Continue to next step"}
          >
            <Text style={[
              styles.nextButtonText,
              !isCurrentStepComplete() && currentStep !== 2 && styles.nextButtonTextDisabled
            ]}>
              {currentStep === 2 ? 'Complete' : 'Continue'}
            </Text>
            <ArrowRight size={20} color={!isCurrentStepComplete() && currentStep !== 2 ? "#A1A1AA" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.privacyText}>
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
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
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
    marginBottom: 20,
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
  stepContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
    marginBottom: 32,
    maxWidth: '85%',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    minHeight: 120,
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
    lineHeight: 20,
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
    padding: 24,
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
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: '90%',
  },
});