import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { addUserFeedback } from '../lib/firebase'; // Corrected path
import { useRouter } from 'expo-router';
import { FeedbackEntry } from '../types/feedback'; // For type casting selectedOption

const PostDoseFeedbackScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedOption, setSelectedOption] = useState<FeedbackEntry['feeling'] | null>(null);
  const [logText, setLogText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionPress = (option: FeedbackEntry['feeling']) => {
    setSelectedOption(option);
    if (option === "Something felt wrong") {
      setShowTextInput(true);
    } else {
      setShowTextInput(false);
      setLogText(''); // Clear log text if other options are selected
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) {
      Alert.alert("Selection Required", "Please select how the dose felt.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not identified. Please try logging in again.");
      console.error("User ID is not available for feedback submission.");
      return;
    }

    setIsSubmitting(true);

    const feedbackData: Omit<FeedbackEntry, 'timestamp' | 'userId'> = {
      feeling: selectedOption,
    };

    if (selectedOption === "Something felt wrong" && logText.trim()) {
      feedbackData.log = logText.trim();
    }

    const success = await addUserFeedback(feedbackData, user.uid);

    if (success) {
      Alert.alert("Feedback Submitted", "Thank you for your feedback!");
      router.replace('/(tabs)/new-dose'); // Navigate to home/new-dose tab
    } else {
      Alert.alert("Submission Failed", "Could not submit feedback. Please try again.");
    }

    setIsSubmitting(false);
  };

  // Log user ID when component mounts or user changes, for verification (can be removed in production)
  React.useEffect(() => {
    console.log('User ID from useEffect:', user?.uid);
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>How did this dose feel?</Text>

      <TouchableOpacity
        style={[styles.button, selectedOption === "Great" && styles.selectedButton]}
        onPress={() => handleOptionPress("Great")}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>Great</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, selectedOption === "Mild side effects" && styles.selectedButton]}
        onPress={() => handleOptionPress("Mild side effects")}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>Mild side effects</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, selectedOption === "Something felt wrong" && styles.selectedButton]}
        onPress={() => handleOptionPress("Something felt wrong")}
        disabled={isSubmitting}
      >
        <Text style={styles.buttonText}>Something felt wrong</Text>
      </TouchableOpacity>

      {showTextInput && (
        <TextInput
          style={styles.textInput}
          placeholder="Optional: Describe what felt wrong..."
          placeholderTextColor="#888"
          value={logText}
          onChangeText={setLogText}
          editable={!isSubmitting}
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? 'Submitting...' : 'Submit'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center', // Keep centered, adjust padding for space
    paddingHorizontal: 20,
    paddingVertical: 30, // Increased vertical padding
    backgroundColor: '#f7f7f7', // Slightly lighter background
  },
  title: {
    fontSize: 28, // Increased font size
    fontWeight: '600', // Slightly less bold than 'bold'
    color: '#333',
    marginBottom: 40, // Increased margin
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 18, // Increased padding
    paddingHorizontal: 25,
    borderRadius: 30, // More rounded
    marginBottom: 20, // Increased margin
    width: '90%', // Wider buttons
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 }, // Subtle shadow
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2, // Subtle elevation for Android
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border for all buttons
  },
  selectedButton: {
    backgroundColor: '#e6f2ff', // Lighter blue for selected
    borderColor: '#007bff', // Primary color border
    borderWidth: 2, // Thicker border for selected
  },
  buttonText: {
    fontSize: 18,
    color: '#2c3e50', // Darker, more saturated text color
    fontWeight: '500',
  },
  textInput: {
    width: '90%', // Match button width
    height: 120, // Increased height for more text
    borderColor: '#bdc3c7', // Softer border color
    borderWidth: 1,
    borderRadius: 12, // More rounded corners
    padding: 15,
    marginTop: 15, // Add margin top
    marginBottom: 25, // Increased margin
    backgroundColor: '#ffffff',
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007bff', // Primary action color
    paddingVertical: 18, // Increased padding
    paddingHorizontal: 30,
    borderRadius: 30, // Match option buttons
    width: '90%', // Match other elements
    alignItems: 'center',
    marginTop: 25, // Increased margin
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#a0cfff',
    opacity: 0.7, // Make it look more disabled
  },
  submitButtonText: {
    fontSize: 19, // Slightly larger text for submit
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default PostDoseFeedbackScreen;
