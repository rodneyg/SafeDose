import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export type WhyAreYouHereResponse = 
  | 'reddit'
  | 'twitter'
  | 'friend'
  | 'clean_calculator'
  | 'ai_scan'
  | 'dose_logs'
  | 'comparing_tools'
  | 'other';

interface WhyAreYouHereScreenProps {
  onSubmit: (response: WhyAreYouHereResponse, customText?: string) => void;
  onSkip: () => void;
  isMobileWeb: boolean;
}

export default function WhyAreYouHereScreen({
  onSubmit,
  onSkip,
  isMobileWeb,
}: WhyAreYouHereScreenProps) {
  const [selectedResponse, setSelectedResponse] = useState<WhyAreYouHereResponse | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleResponseSelect = useCallback((response: WhyAreYouHereResponse) => {
    setSelectedResponse(response);
    if (response === 'other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomText('');
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedResponse) {
      logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_RESPONSE, {
        response: selectedResponse,
        hasCustomText: selectedResponse === 'other' && customText.trim().length > 0,
      });
      onSubmit(selectedResponse, selectedResponse === 'other' ? customText.trim() : undefined);
    }
  }, [selectedResponse, customText, onSubmit]);

  const handleSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.WHY_HERE_PROMPT_SKIPPED);
    onSkip();
  }, [onSkip]);

  const getResponseLabel = (response: WhyAreYouHereResponse) => {
    switch (response) {
      case 'reddit':
        return '🔘 Reddit';
      case 'twitter':
        return '🔘 Twitter / X';
      case 'friend':
        return '🔘 Heard from a friend';
      case 'clean_calculator':
        return '🔘 Needed a clean calculator';
      case 'ai_scan':
        return '🔘 Trying the AI scan';
      case 'dose_logs':
        return '🔘 Curious about dose logs';
      case 'comparing_tools':
        return '🔘 Comparing tools / other peptide site';
      case 'other':
        return '🔘 Other';
      default:
        return '';
    }
  };

  const responseOptions: WhyAreYouHereResponse[] = [
    'reddit',
    'twitter',
    'friend',
    'clean_calculator',
    'ai_scan',
    'dose_logs',
    'comparing_tools',
    'other'
  ];

  return (
    <ScrollView contentContainerStyle={[styles.container, isMobileWeb && styles.containerMobile]}>
      <View style={[styles.headerContainer, isMobileWeb && styles.headerContainerMobile]}>
        <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
          Quick question — what brought you here today?
        </Text>
        <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
          (Pick one — optional)
        </Text>
      </View>

      <View style={[styles.responseOptions, isMobileWeb && styles.responseOptionsMobile]}>
        {responseOptions.map((response) => (
          <TouchableOpacity
            key={response}
            style={[
              styles.responseOption,
              selectedResponse === response && styles.responseOptionSelected,
              isMobileWeb && styles.responseOptionMobile,
            ]}
            onPress={() => handleResponseSelect(response)}
          >
            <Text
              style={[
                styles.responseText,
                selectedResponse === response && styles.responseTextSelected,
                isMobileWeb && styles.responseTextMobile,
              ]}
            >
              {getResponseLabel(response)}
            </Text>
            {selectedResponse === response && (
              <CheckCircle size={16} color="#10B981" style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {showCustomInput && (
        <View style={[styles.customInputContainer, isMobileWeb && styles.customInputContainerMobile]}>
          <TextInput
            style={[styles.customInput, isMobileWeb && styles.customInputMobile]}
            placeholder="Tell us more (optional)..."
            value={customText}
            onChangeText={setCustomText}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{customText.length}/200</Text>
        </View>
      )}

      <View style={[styles.buttonContainer, isMobileWeb && styles.buttonContainerMobile]}>
        <TouchableOpacity
          style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
          onPress={handleSkip}
        >
          <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>
            Skip
          </Text>
        </TouchableOpacity>
        
        {selectedResponse && (
          <TouchableOpacity
            style={[styles.submitButton, isMobileWeb && styles.submitButtonMobile]}
            onPress={handleSubmit}
          >
            <Text style={[styles.submitButtonText, isMobileWeb && styles.submitButtonTextMobile]}>
              Continue
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  containerMobile: {
    padding: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
    maxWidth: 500,
  },
  headerContainerMobile: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 28,
  },
  titleMobile: {
    fontSize: 20,
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  subtitleMobile: {
    fontSize: 14,
  },
  responseOptions: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 24,
  },
  responseOptionsMobile: {
    marginBottom: 20,
  },
  responseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  responseOptionSelected: {
    backgroundColor: '#EBF8FF',
    borderColor: '#10B981',
  },
  responseOptionMobile: {
    padding: 14,
    marginBottom: 10,
  },
  responseText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  responseTextSelected: {
    color: '#065F46',
    fontWeight: '600',
  },
  responseTextMobile: {
    fontSize: 15,
  },
  checkIcon: {
    marginLeft: 8,
  },
  customInputContainer: {
    width: '100%',
    maxWidth: 500,
    marginBottom: 24,
  },
  customInputContainerMobile: {
    marginBottom: 20,
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    marginTop: 20,
  },
  buttonContainerMobile: {
    marginTop: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonMobile: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
  },
  submitButtonMobile: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 100,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButtonTextMobile: {
    fontSize: 15,
  },
});