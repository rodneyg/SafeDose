import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowRight, ArrowLeft, Calendar } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { isMobileWeb } from '@/lib/utils';

export default function AgeCollection() {
  const router = useRouter();
  const [age, setAge] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleAgeChange = useCallback((text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setAge(numericValue);
    
    // Validate age (reasonable range 13-120)
    const ageNum = parseInt(numericValue);
    setIsValid(ageNum >= 13 && ageNum <= 120);
  }, []);

  const handleContinue = useCallback(() => {
    const ageNum = parseInt(age);
    
    if (!isValid || !ageNum) {
      Alert.alert('Invalid Age', 'Please enter a valid age between 13 and 120.');
      return;
    }

    // Log analytics
    logAnalyticsEvent(ANALYTICS_EVENTS.AGE_COLLECTION_COMPLETED, {
      age: ageNum,
      age_range: ageNum < 18 ? 'minor' : ageNum < 65 ? 'adult' : 'senior'
    });

    // Store age temporarily and route based on age
    if (ageNum < 18) {
      // Route to child safety screen for minors
      router.push({
        pathname: '/onboarding/child-safety',
        params: { age: ageNum.toString() }
      });
    } else {
      // Route to demo for adults
      router.push({
        pathname: '/onboarding/demo',
        params: { age: ageNum.toString() }
      });
    }
  }, [age, isValid, router]);

  const handleSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.AGE_COLLECTION_SKIPPED);
    // Continue to demo without age information
    router.push('/onboarding/demo');
  }, [router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  React.useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.AGE_COLLECTION_SHOWN);
  }, []);

  return (
    <View style={styles.container}>
      <View style={[styles.content, isMobileWeb && styles.contentMobile]}>
        <Animated.View entering={FadeIn.delay(300).duration(800)} style={styles.header}>
          <View style={[styles.iconContainer, isMobileWeb && styles.iconContainerMobile]}>
            <Calendar size={isMobileWeb ? 32 : 40} color="#007AFF" />
          </View>
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
            Welcome to SafeDose
          </Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            To provide you with the most appropriate guidance, could you please share your age?
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(800)} style={styles.inputSection}>
          <View style={[styles.inputContainer, isMobileWeb && styles.inputContainerMobile]}>
            <Text style={[styles.inputLabel, isMobileWeb && styles.inputLabelMobile]}>
              Age
            </Text>
            <TextInput
              style={[
                styles.input,
                isMobileWeb && styles.inputMobile,
                !isValid && age.length > 0 && styles.inputError
              ]}
              value={age}
              onChangeText={handleAgeChange}
              placeholder="Enter your age"
              placeholderTextColor="#8E8E93"
              keyboardType="numeric"
              maxLength={3}
              autoFocus={!isMobileWeb}
              accessibilityLabel="Age input"
              accessibilityHint="Enter your age to continue"
            />
            {age.length > 0 && !isValid && (
              <Text style={[styles.errorText, isMobileWeb && styles.errorTextMobile]}>
                Please enter a valid age (13-120)
              </Text>
            )}
          </View>
          
          <Text style={[styles.privacyNote, isMobileWeb && styles.privacyNoteMobile]}>
            This information helps us provide age-appropriate guidance and safety features.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(900).duration(800)} style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              isMobileWeb && styles.continueButtonMobile,
              !isValid && styles.continueButtonDisabled
            ]}
            onPress={handleContinue}
            disabled={!isValid}
            accessibilityRole="button"
            accessibilityLabel="Continue with age"
            accessibilityHint="Proceed to next step"
          >
            <Text style={[
              styles.continueButtonText,
              isMobileWeb && styles.continueButtonTextMobile,
              !isValid && styles.continueButtonTextDisabled
            ]}>
              Continue
            </Text>
            <ArrowRight size={isMobileWeb ? 18 : 20} color={isValid ? "#FFFFFF" : "#8E8E93"} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel="Skip age entry"
            accessibilityHint="Continue without providing age"
          >
            <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>
              Prefer not to answer
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={isMobileWeb ? 18 : 20} color="#8E8E93" />
          <Text style={[styles.backButtonText, isMobileWeb && styles.backButtonTextMobile]}>
            Back
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '85%',
  },
  inputSection: {
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  },
  privacyNote: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
  buttonContainer: {
    alignItems: 'center',
    gap: 16,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 200,
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#F2F2F7',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#8E8E93',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },

  // Mobile-specific styles
  contentMobile: {
    paddingHorizontal: 20,
  },
  iconContainerMobile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 20,
  },
  titleMobile: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitleMobile: {
    fontSize: 16,
    lineHeight: 22,
    maxWidth: '90%',
  },
  inputContainerMobile: {
    maxWidth: 280,
    marginBottom: 20,
  },
  inputLabelMobile: {
    fontSize: 15,
    marginBottom: 6,
  },
  inputMobile: {
    paddingVertical: 14,
    fontSize: 16,
  },
  errorTextMobile: {
    fontSize: 13,
  },
  privacyNoteMobile: {
    fontSize: 13,
    lineHeight: 18,
    maxWidth: '85%',
  },
  continueButtonMobile: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    minWidth: 180,
  },
  continueButtonTextMobile: {
    fontSize: 16,
  },
  skipButtonMobile: {
    paddingVertical: 10,
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
  backButtonMobile: {
    paddingVertical: 10,
  },
  backButtonTextMobile: {
    fontSize: 15,
  },
});