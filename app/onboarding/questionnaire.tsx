import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth, UserProfile } from '@/contexts/AuthContext'; // Import useAuth and UserProfile

const QuestionnaireScreen = () => {
  const router = useRouter();
  const { updateUserProfile, user } = useAuth(); // Get updateUserProfile and user from context
  const [isHealthProfessional, setIsHealthProfessional] = useState<boolean | null>(null);
  const [isPersonalUse, setIsPersonalUse] = useState<boolean | null>(null);
  const [useType, setUseType] = useState<'Cosmetic' | 'Prescribed' | null>(null); // Ensure type matches UserProfile
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allQuestionsAnswered =
    isHealthProfessional !== null &&
    isPersonalUse !== null &&
    useType !== null;

  const handleContinue = async () => {
    if (!allQuestionsAnswered || !user) {
      Alert.alert("Validation Error", "Please answer all questions before continuing.");
      return;
    }

    setIsSubmitting(true);
    const profileData: UserProfile = {
      isHealthProfessional,
      isPersonalUse,
      useType,
    };

    try {
      await updateUserProfile(profileData);
      Alert.alert("Success", "Your profile has been updated.");
      router.push('/onboarding/demo'); // Navigate to the next screen
    } catch (error) {
      console.error("Failed to update profile:", error);
      Alert.alert("Error", "Failed to update your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: 'Questionnaire', headerBackTitle: 'Back' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Tell us about yourself</Text>

        {/* Question 1 */}
        <Text style={styles.question}>Are you a licensed health professional?</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, isHealthProfessional === true && styles.selectedOption]}
            onPress={() => setIsHealthProfessional(true)}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, isHealthProfessional === false && styles.selectedOption]}
            onPress={() => setIsHealthProfessional(false)}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>No</Text>
          </TouchableOpacity>
        </View>

        {/* Question 2 */}
        <Text style={styles.question}>Are you using this personally?</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, isPersonalUse === true && styles.selectedOption]}
            onPress={() => setIsPersonalUse(true)}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, isPersonalUse === false && styles.selectedOption]}
            onPress={() => setIsPersonalUse(false)}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>No</Text>
          </TouchableOpacity>
        </View>

        {/* Question 3 */}
        <Text style={styles.question}>Is this for cosmetic or prescribed use?</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionButton, useType === 'Cosmetic' && styles.selectedOption]}
            onPress={() => setUseType('Cosmetic')}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>Cosmetic</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionButton, useType === 'Prescribed' && styles.selectedOption]}
            onPress={() => setUseType('Prescribed')}
            disabled={isSubmitting}
          >
            <Text style={styles.optionText}>Prescribed</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (!allQuestionsAnswered || isSubmitting) && styles.disabledButton]}
          onPress={handleContinue}
          disabled={!allQuestionsAnswered || isSubmitting}
        >
          <Text style={styles.continueButtonText}>{isSubmitting ? 'Saving...' : 'Continue'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  question: {
    fontSize: 18,
    marginBottom: 10,
    marginTop: 15,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOption: {
    backgroundColor: '#007bff',
    borderColor: '#0056b3',
  },
  optionText: {
    fontSize: 16,
    color: '#333', // Default text color
  },
  // Ensure selected option text is readable
  selectedOptionText: {
    color: '#fff', // Text color for selected option
  },
  continueButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 30,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0', // Grey out button when disabled
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default QuestionnaireScreen;
