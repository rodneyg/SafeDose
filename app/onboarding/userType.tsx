import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { UserProfileAnswers, UserProfile } from '@/types/userProfile';

export default function UserTypeSegmentation() {
  const router = useRouter();
  const { saveProfile } = useUserProfile();
  const [answers, setAnswers] = useState<UserProfileAnswers>({
    isLicensedProfessional: null,
    isPersonalUse: null,
    isCosmeticUse: null,
  });

  const handleAnswerChange = useCallback((question: keyof UserProfileAnswers, value: boolean) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  }, []);

  const isComplete = Object.values(answers).every(answer => answer !== null);

  const handleContinue = useCallback(async () => {
    if (!isComplete) return;

    try {
      const profile: UserProfile = {
        isLicensedProfessional: answers.isLicensedProfessional!,
        isPersonalUse: answers.isPersonalUse!,
        isCosmeticUse: answers.isCosmeticUse!,
        dateCreated: new Date().toISOString(),
      };

      await saveProfile(profile);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error saving user profile:', error);
      // Fallback navigation
      router.replace('/(tabs)');
    }
  }, [answers, isComplete, saveProfile, router]);

  const renderQuestion = (
    question: string,
    key: keyof UserProfileAnswers,
    description?: string
  ) => (
    <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.questionContainer}>
      <Text style={styles.questionText}>{question}</Text>
      {description && <Text style={styles.descriptionText}>{description}</Text>}
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            answers[key] === true && styles.optionButtonSelected,
          ]}
          onPress={() => handleAnswerChange(key, true)}
          accessibilityRole="button"
          accessibilityLabel={`Yes to ${question}`}
        >
          {answers[key] === true && <Check size={20} color="#FFFFFF" />}
          <Text style={[
            styles.optionText,
            answers[key] === true && styles.optionTextSelected,
          ]}>
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            answers[key] === false && styles.optionButtonSelected,
          ]}
          onPress={() => handleAnswerChange(key, false)}
          accessibilityRole="button"
          accessibilityLabel={`No to ${question}`}
        >
          {answers[key] === false && <X size={20} color="#FFFFFF" />}
          <Text style={[
            styles.optionText,
            answers[key] === false && styles.optionTextSelected,
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeIn.delay(100).duration(800)} style={styles.header}>
          <Text style={styles.title}>Let's Personalize Your Experience</Text>
          <Text style={styles.subtitle}>
            These questions help us provide appropriate safety guidance and disclaimers.
          </Text>
        </Animated.View>

        <View style={styles.questionsContainer}>
          {renderQuestion(
            "Are you a licensed health professional?",
            "isLicensedProfessional",
            "Healthcare providers, nurses, doctors, pharmacists, etc."
          )}

          {renderQuestion(
            "Are you using this personally?",
            "isPersonalUse",
            "Using for yourself vs. preparing for someone else"
          )}

          {renderQuestion(
            "Is this for cosmetic or prescribed use?",
            "isCosmeticUse",
            "Cosmetic injections vs. medical prescriptions"
          )}
        </View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !isComplete && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isComplete}
          accessibilityRole="button"
          accessibilityLabel="Continue to app"
          accessibilityHint="Saves your preferences and continues to the main app"
        >
          <Text style={[styles.continueButtonText, !isComplete && styles.continueButtonTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.privacyText}>
          Your answers are stored locally on your device and help customize safety warnings.
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
  },
  questionsContainer: {
    gap: 24,
  },
  questionContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 16,
    lineHeight: 20,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#E5E5EA',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#A1A1AA',
  },
  privacyText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});