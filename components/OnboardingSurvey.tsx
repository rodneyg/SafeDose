import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import type { OnboardingSurveyResult, PMFSurveyResponse, WhyAreYouHereResponse } from '../types/pmf-survey';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

type Disappointment = NonNullable<PMFSurveyResponse['responses']['disappointment']>;

const WHY_HERE_OPTIONS: { value: WhyAreYouHereResponse; label: string }[] = [
  { value: 'reddit', label: 'Reddit' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'friend', label: 'Heard from a friend' },
  { value: 'clean_calculator', label: 'Needed a clean calculator' },
  { value: 'ai_scan', label: 'Trying the AI scan' },
  { value: 'dose_logs', label: 'Curious about dose logs' },
  { value: 'comparing_tools', label: 'Comparing tools / other peptide site' },
  { value: 'other', label: 'Other' },
];

const DISAPPOINTMENT_OPTIONS: { value: Disappointment; label: string }[] = [
  { value: 'very_disappointed', label: 'Very disappointed' },
  { value: 'somewhat_disappointed', label: 'Somewhat disappointed' },
  { value: 'not_disappointed', label: 'Not disappointed' },
];

const PMF_TEXT_QUESTIONS = [
  { id: 'benefitPerson', label: 'What type of person do you think would most benefit from SafeDose?' },
  { id: 'mainBenefit', label: "What is the main benefit you've received from using SafeDose so far?" },
  { id: 'improvements', label: 'How can we improve SafeDose for you?' },
] as const;

interface OnboardingSurveyProps {
  includeWhyHere: boolean;
  sessionCount: number;
  onComplete: (result: OnboardingSurveyResult) => void;
  isMobileWeb?: boolean;
}

function SurveyOptions<Value extends string>({ options, selected, onSelect }: {
  options: readonly { value: Value; label: string }[];
  selected?: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <View style={styles.optionsContainer}>
      {options.map(({ value, label }) => (
        <TouchableOpacity
          key={value}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === value }}
          style={[styles.option, selected === value && styles.optionSelected]}
          onPress={() => onSelect(value)}
        >
          <Text style={[styles.optionText, selected === value && styles.optionTextSelected]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OnboardingSurvey({
  includeWhyHere,
  sessionCount,
  onComplete,
  isMobileWeb = false,
}: OnboardingSurveyProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [reason, setReason] = useState<WhyAreYouHereResponse>();
  const [customText, setCustomText] = useState('');
  const [disappointment, setDisappointment] = useState<Disappointment>();
  const [textAnswers, setTextAnswers] = useState({ benefitPerson: '', mainBenefit: '', improvements: '' });

  const pmfIndex = questionIndex - Number(includeWhyHere);
  const isWhyHere = pmfIndex === -1;
  const isDisappointment = pmfIndex === 0;
  const textQuestion = PMF_TEXT_QUESTIONS[pmfIndex - 1];
  const totalQuestions = PMF_TEXT_QUESTIONS.length + 1 + Number(includeWhyHere);
  const isLastQuestion = questionIndex + 1 === totalQuestions;
  const canAdvance = isWhyHere || !!(isDisappointment ? disappointment : textAnswers[textQuestion.id].trim());
  const whyHere = reason ? { response: reason, customText: reason === 'other' ? customText.trim() : undefined } : undefined;

  const handleNext = () => {
    if (!canAdvance) return;
    if (textQuestion) {
      logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
        questionIndex: pmfIndex,
        questionId: textQuestion.id,
        answerType: 'text',
        answerLength: textAnswers[textQuestion.id].trim().length,
        sessionCount,
      });
    }

    if (isLastQuestion && disappointment && textAnswers.benefitPerson.trim()
        && textAnswers.mainBenefit.trim() && textAnswers.improvements.trim()) {
      onComplete({
        whyHere,
        questionIndex: pmfIndex,
        pmf: {
          disappointment,
          benefitPerson: textAnswers.benefitPerson.trim(),
          mainBenefit: textAnswers.mainBenefit.trim(),
          improvements: textAnswers.improvements.trim(),
        },
      });
    } else if (!isLastQuestion) {
      setQuestionIndex(questionIndex + 1);
    }
  };

  let question: string = textQuestion?.label;
  if (isWhyHere) question = 'What brought you here today? (Optional)';
  if (isDisappointment) question = 'How would you feel if you could no longer use SafeDose?';

  return (
    <View style={[styles.overlay, isMobileWeb && styles.overlayMobile]}>
      <View accessibilityViewIsModal style={[styles.modal, isMobileWeb && styles.modalMobile]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <Text accessibilityLiveRegion="polite" style={styles.progressText}>
                {questionIndex + 1} of {totalQuestions}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((questionIndex + 1) / totalQuestions) * 100}%` }]} />
              </View>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => onComplete({ whyHere, questionIndex: Math.max(0, pmfIndex) })}
              style={styles.skipButton}
            >
              <Text style={styles.backButtonText}>Skip survey</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.questionContainer}>
            <Text style={[styles.question, isMobileWeb && styles.questionMobile]}>{question}</Text>
            {isWhyHere && (
              <>
                <SurveyOptions
                  options={WHY_HERE_OPTIONS}
                  selected={reason}
                  onSelect={value => {
                    setReason(value);
                    if (value !== 'other') setCustomText('');
                  }}
                />
                {reason === 'other' && (
                  <TextInput
                    accessibilityLabel="Tell us more (optional)"
                    style={styles.textInput}
                    value={customText}
                    onChangeText={setCustomText}
                    placeholder="Tell us more (optional)"
                    maxLength={200}
                    multiline
                  />
                )}
              </>
            )}
            {isDisappointment && (
              <SurveyOptions
                options={DISAPPOINTMENT_OPTIONS}
                selected={disappointment}
                onSelect={value => {
                  setDisappointment(value);
                  logAnalyticsEvent(ANALYTICS_EVENTS.PMF_SURVEY_QUESTION_ANSWERED, {
                    questionIndex: pmfIndex, questionId: 'disappointment', answerType: 'multiple_choice', sessionCount,
                  });
                }}
              />
            )}
            {textQuestion && (
              <TextInput
                key={textQuestion.id}
                accessibilityLabel={textQuestion.label}
                style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
                value={textAnswers[textQuestion.id]}
                onChangeText={value => setTextAnswers(answers => ({ ...answers, [textQuestion.id]: value }))}
                placeholder="Please describe"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={styles.navigation}>
            {questionIndex > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setQuestionIndex(questionIndex - 1)}
                style={[styles.backButton, isMobileWeb && styles.backButtonMobile]}
              >
                <ChevronLeft size={18} color="#666" />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleNext}
              disabled={!canAdvance}
              style={[styles.nextButton, !canAdvance && styles.nextButtonDisabled, isMobileWeb && styles.nextButtonMobile]}
            >
              <Text style={[styles.nextButtonText, !canAdvance && styles.nextButtonTextDisabled]}>
                {isLastQuestion ? 'Complete' : 'Next'}
              </Text>
              <ChevronRight size={18} color={canAdvance ? '#fff' : '#ccc'} />
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
    marginBottom: 20,
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
  skipButton: {
    padding: 8,
  },
  questionContainer: {
    marginBottom: 20,
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
