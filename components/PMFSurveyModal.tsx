import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft, X } from 'lucide-react-native';
import { PMFSurveyResponse } from '../types/pmf-survey';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface PMFSurveyModalProps {
  isVisible: boolean;
  onComplete: (responses: PMFSurveyResponse['responses']) => void;
  onSkip: () => void;
  sessionCount: number;
  isMobileWeb?: boolean;
}

const PMF_QUESTIONS = [
  {
    id: 'disappointment',
    question: 'How would you feel if you could no longer use SafeDose?',
    type: 'multiple_choice' as const,
    options: [
      { value: 'very_disappointed', label: 'Very disappointed' },
      { value: 'somewhat_disappointed', label: 'Somewhat disappointed' },
      { value: 'not_disappointed', label: 'Not disappointed' },
    ],
  },
  {
    id: 'benefitPerson',
    question: 'What type of person do you think would most benefit from SafeDose?',
    type: 'text' as const,
    placeholder: 'Please describe...',
  },
  {
    id: 'mainBenefit',
    question: 'What is the main benefit you\'ve received from using SafeDose so far?',
    type: 'text' as const,
    placeholder: 'Please describe...',
  },
  {
    id: 'improvements',
    question: 'How can we improve SafeDose for you?',
    type: 'text' as const,
    placeholder: 'Please share your suggestions...',
  },
];

export default function PMFSurveyModal({
  isVisible,
  onComplete,
  onSkip,
  sessionCount,
  isMobileWeb = false,
}: PMFSurveyModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<PMFSurveyResponse['responses']>({});
  const [textInput, setTextInput] = useState('');

  const currentQuestion = PMF_QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === PMF_QUESTIONS.length - 1;
  const canGoNext = currentQuestion.type === 'multiple_choice' 
    ? !!responses[currentQuestion.id as keyof typeof responses]
    : textInput.trim().length > 0;

  const handleMultipleChoiceSelect = useCallback((value: string) => {
    const questionId = currentQuestion.id as keyof PMFSurveyResponse['responses'];
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));

    logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
      questionIndex: currentQuestionIndex,
      questionId: currentQuestion.id,
      answerType: 'multiple_choice',
      sessionCount,
    });
  }, [currentQuestion, currentQuestionIndex, sessionCount]);

  const handleNext = useCallback(() => {
    if (currentQuestion.type === 'text') {
      const questionId = currentQuestion.id as keyof PMFSurveyResponse['responses'];
      setResponses(prev => ({
        ...prev,
        [questionId]: textInput.trim(),
      }));

      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
        questionIndex: currentQuestionIndex,
        questionId: currentQuestion.id,
        answerType: 'text',
        answerLength: textInput.trim().length,
        sessionCount,
      });
    }

    if (isLastQuestion) {
      // Complete survey
      const finalResponses = currentQuestion.type === 'text' 
        ? { ...responses, [currentQuestion.id]: textInput.trim() }
        : responses;
      onComplete(finalResponses);
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setTextInput('');
    }
  }, [currentQuestion, currentQuestionIndex, isLastQuestion, textInput, responses, onComplete, sessionCount]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Load previous text input if going back to a text question
      const prevQuestion = PMF_QUESTIONS[currentQuestionIndex - 1];
      if (prevQuestion.type === 'text') {
        const prevResponse = responses[prevQuestion.id as keyof typeof responses];
        setTextInput(typeof prevResponse === 'string' ? prevResponse : '');
      }
    }
  }, [currentQuestionIndex, responses]);

  const handleSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_DISMISSED, {
      questionIndex: currentQuestionIndex,
      totalQuestions: PMF_QUESTIONS.length,
      sessionCount,
    });
    onSkip();
  }, [currentQuestionIndex, sessionCount, onSkip]);

  if (!isVisible) return null;

  return (
    <View style={[styles.overlay, isMobileWeb && styles.overlayMobile]}>
      <View style={[styles.modal, isMobileWeb && styles.modalMobile]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentQuestionIndex + 1} of {PMF_QUESTIONS.length}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentQuestionIndex + 1) / PMF_QUESTIONS.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Question */}
          <View style={styles.questionContainer}>
            <Text style={[styles.question, isMobileWeb && styles.questionMobile]}>
              {currentQuestion.question}
            </Text>

            {currentQuestion.type === 'multiple_choice' ? (
              <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      responses[currentQuestion.id as keyof typeof responses] === option.value && styles.optionSelected,
                    ]}
                    onPress={() => handleMultipleChoiceSelect(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      responses[currentQuestion.id as keyof typeof responses] === option.value && styles.optionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={currentQuestion.placeholder}
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {currentQuestionIndex > 0 && (
              <TouchableOpacity onPress={handleBack} style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}>
                <ChevronLeft size={18} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canGoNext}
              style={[
                styles.nextButton,
                !canGoNext && styles.nextButtonDisabled,
                isMobileWeb && styles.nextButtonMobile,
              ]}
            >
              <Text style={[styles.nextButtonText, !canGoNext && styles.nextButtonTextDisabled]}>
                {isLastQuestion ? 'Complete' : 'Next'}
              </Text>
              <ChevronRight size={18} color={canGoNext ? '#fff' : '#ccc'} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayMobile: {
    position: 'fixed' as any,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    maxWidth: 500,
    width: '90%',
    maxHeight: '80%',
  },
  modalMobile: {
    margin: 10,
    width: '95%',
    maxHeight: '90%',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e5e5',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  closeButton: {
    padding: 8,
  },
  questionContainer: {
    marginBottom: 32,
  },
  question: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 24,
    lineHeight: 32,
  },
  questionMobile: {
    fontSize: 20,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
    minHeight: 120,
  },
  textInputMobile: {
    minHeight: 100,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  backButtonMobile: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  nextButtonMobile: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  nextButtonDisabled: {
    backgroundColor: '#e5e5e5',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  nextButtonTextDisabled: {
    color: '#ccc',
  },
});