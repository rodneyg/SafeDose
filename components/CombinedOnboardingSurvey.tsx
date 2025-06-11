import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft, X, CheckCircle } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import type { 
  CombinedOnboardingSurveyResponses, 
  WhyAreYouHereResponse 
} from '../types/combined-onboarding-survey';

interface CombinedOnboardingSurveyProps {
  isVisible: boolean;
  onComplete: (responses: CombinedOnboardingSurveyResponses) => void;
  onSkip: () => void;
  sessionCount: number;
  isMobileWeb?: boolean;
}

// Define the survey steps
const SURVEY_STEPS = [
  {
    id: 'whyAreYouHere',
    question: 'Quick question — what brought you here today?',
    subtitle: '(Pick one — optional)',
    type: 'whyAreYouHere' as const,
  },
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

// Why Are You Here options
const WHY_HERE_OPTIONS: { value: WhyAreYouHereResponse; label: string }[] = [
  { value: 'reddit', label: '🔘 Reddit' },
  { value: 'twitter', label: '🔘 Twitter / X' },
  { value: 'friend', label: '🔘 Heard from a friend' },
  { value: 'clean_calculator', label: '🔘 Needed a clean calculator' },
  { value: 'ai_scan', label: '🔘 Trying the AI scan' },
  { value: 'dose_logs', label: '🔘 Curious about dose logs' },
  { value: 'comparing_tools', label: '🔘 Comparing tools / other peptide site' },
  { value: 'other', label: '🔘 Other' },
];

export default function CombinedOnboardingSurvey({
  isVisible,
  onComplete,
  onSkip,
  sessionCount,
  isMobileWeb = false,
}: CombinedOnboardingSurveyProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [responses, setResponses] = useState<CombinedOnboardingSurveyResponses>({});
  const [textInput, setTextInput] = useState('');
  const [whyHereCustomText, setWhyHereCustomText] = useState('');
  const [showWhyHereCustomInput, setShowWhyHereCustomInput] = useState(false);

  const currentStep = SURVEY_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === SURVEY_STEPS.length - 1;
  
  // Determine if user can proceed to next step
  const canGoNext = () => {
    if (currentStep.type === 'whyAreYouHere') {
      return !!responses.whyAreYouHere?.response;
    } else if (currentStep.type === 'multiple_choice') {
      return !!responses.pmf?.[currentStep.id as keyof typeof responses.pmf];
    } else if (currentStep.type === 'text') {
      return textInput.trim().length > 0;
    }
    return false;
  };

  // Handle Why Are You Here selection
  const handleWhyHereSelect = useCallback((response: WhyAreYouHereResponse) => {
    setResponses(prev => ({
      ...prev,
      whyAreYouHere: {
        response,
        customText: response === 'other' ? whyHereCustomText : undefined,
      }
    }));
    
    if (response === 'other') {
      setShowWhyHereCustomInput(true);
    } else {
      setShowWhyHereCustomInput(false);
      setWhyHereCustomText('');
    }

    // Log analytics for Why Are You Here step
    logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SHOWN);
  }, [whyHereCustomText]);

  // Handle multiple choice selection for PMF questions
  const handleMultipleChoiceSelect = useCallback((value: string) => {
    setResponses(prev => ({
      ...prev,
      pmf: {
        ...prev.pmf,
        [currentStep.id]: value,
      }
    }));

    // Log PMF analytics
    logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
      questionIndex: currentStepIndex - 1, // Subtract 1 since first step is Why Are You Here
      questionId: currentStep.id,
      answerType: 'multiple_choice',
      sessionCount,
    });
  }, [currentStep, currentStepIndex, sessionCount]);

  // Handle next step
  const handleNext = useCallback(() => {
    // Save current step data
    if (currentStep.type === 'whyAreYouHere') {
      // Update custom text if "Other" was selected
      if (responses.whyAreYouHere?.response === 'other') {
        setResponses(prev => ({
          ...prev,
          whyAreYouHere: {
            ...prev.whyAreYouHere!,
            customText: whyHereCustomText.trim(),
          }
        }));
      }
    } else if (currentStep.type === 'text') {
      setResponses(prev => ({
        ...prev,
        pmf: {
          ...prev.pmf,
          [currentStep.id]: textInput.trim(),
        }
      }));

      // Log PMF analytics for text questions
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
        questionIndex: currentStepIndex - 1, // Subtract 1 since first step is Why Are You Here
        questionId: currentStep.id,
        answerType: 'text',
        answerLength: textInput.trim().length,
        sessionCount,
      });
    }

    if (isLastStep) {
      // Complete survey
      const finalResponses = currentStep.type === 'text' 
        ? {
            ...responses,
            pmf: {
              ...responses.pmf,
              [currentStep.id]: textInput.trim(),
            }
          }
        : responses;
      
      onComplete(finalResponses);
    } else {
      // Move to next step
      setCurrentStepIndex(prev => prev + 1);
      setTextInput('');
      
      // If moving to a PMF question and it's the first one, log PMF survey shown
      if (currentStepIndex === 0) {
        logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_SHOWN, {
          sessionCount,
        });
      }
    }
  }, [currentStep, currentStepIndex, isLastStep, textInput, whyHereCustomText, responses, onComplete, sessionCount]);

  // Handle going back
  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      
      // Load previous data
      const prevStep = SURVEY_STEPS[currentStepIndex - 1];
      if (prevStep.type === 'text') {
        const prevResponse = responses.pmf?.[prevStep.id as keyof typeof responses.pmf];
        setTextInput(typeof prevResponse === 'string' ? prevResponse : '');
      } else if (prevStep.type === 'whyAreYouHere' && responses.whyAreYouHere?.response === 'other') {
        setWhyHereCustomText(responses.whyAreYouHere.customText || '');
        setShowWhyHereCustomInput(true);
      }
    }
  }, [currentStepIndex, responses]);

  // Handle skip
  const handleSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_DISMISSED, {
      questionIndex: currentStepIndex,
      totalQuestions: SURVEY_STEPS.length,
      sessionCount,
    });
    onSkip();
  }, [currentStepIndex, sessionCount, onSkip]);

  if (!isVisible) return null;

  return (
    <View style={[styles.overlay, isMobileWeb && styles.overlayMobile]}>
      <View style={[styles.modal, isMobileWeb && styles.modalMobile]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {currentStepIndex + 1} of {SURVEY_STEPS.length}
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentStepIndex + 1) / SURVEY_STEPS.length) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Question Content */}
          <View style={styles.questionContainer}>
            <Text style={[styles.question, isMobileWeb && styles.questionMobile]}>
              {currentStep.question}
            </Text>
            
            {currentStep.subtitle && (
              <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
                {currentStep.subtitle}
              </Text>
            )}

            {/* Why Are You Here Options */}
            {currentStep.type === 'whyAreYouHere' && (
              <View style={styles.optionsContainer}>
                {WHY_HERE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      responses.whyAreYouHere?.response === option.value && styles.optionSelected,
                    ]}
                    onPress={() => handleWhyHereSelect(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      responses.whyAreYouHere?.response === option.value && styles.optionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                    {responses.whyAreYouHere?.response === option.value && (
                      <CheckCircle size={16} color="#007AFF" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
                
                {/* Custom input for "Other" option */}
                {showWhyHereCustomInput && (
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={[styles.customInput, isMobileWeb && styles.customInputMobile]}
                      placeholder="Tell us more (optional)..."
                      value={whyHereCustomText}
                      onChangeText={setWhyHereCustomText}
                      multiline
                      maxLength={200}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{whyHereCustomText.length}/200</Text>
                  </View>
                )}
              </View>
            )}

            {/* PMF Multiple Choice Options */}
            {currentStep.type === 'multiple_choice' && (
              <View style={styles.optionsContainer}>
                {currentStep.options?.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      responses.pmf?.[currentStep.id as keyof typeof responses.pmf] === option.value && styles.optionSelected,
                    ]}
                    onPress={() => handleMultipleChoiceSelect(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      responses.pmf?.[currentStep.id as keyof typeof responses.pmf] === option.value && styles.optionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* PMF Text Input */}
            {currentStep.type === 'text' && (
              <TextInput
                style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={currentStep.placeholder}
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            {currentStepIndex > 0 && (
              <TouchableOpacity onPress={handleBack} style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}>
                <ChevronLeft size={18} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canGoNext()}
              style={[
                styles.nextButton,
                !canGoNext() && styles.nextButtonDisabled,
                isMobileWeb && styles.nextButtonMobile,
              ]}
            >
              <Text style={[styles.nextButtonText, !canGoNext() && styles.nextButtonTextDisabled]}>
                {isLastStep ? 'Complete' : 'Next'}
              </Text>
              <ChevronRight size={18} color={canGoNext() ? '#fff' : '#ccc'} />
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
    maxHeight: '85%',
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
    marginBottom: 8,
    lineHeight: 32,
  },
  questionMobile: {
    fontSize: 20,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  subtitleMobile: {
    fontSize: 14,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 8,
  },
  customInputContainer: {
    marginTop: 12,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  customInputMobile: {
    fontSize: 15,
    padding: 10,
    minHeight: 70,
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
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