import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ChevronRight, X, CheckCircle } from 'lucide-react-native';
import { FeedbackType, FeedbackContextType } from '../types/feedback';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface PostDoseFeedbackScreenProps {
  context: FeedbackContextType;
  onSubmit: (feedbackType: FeedbackType, notes?: string) => void;
  onSkip: () => void;
  isMobileWeb: boolean;
}

export default function PostDoseFeedbackScreen({
  context,
  onSubmit,
  onSkip,
  isMobileWeb,
}: PostDoseFeedbackScreenProps) {
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackType | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  const handleFeedbackSelect = useCallback((feedbackType: FeedbackType) => {
    setSelectedFeedback(feedbackType);
    if (feedbackType === 'something_wrong') {
      setShowNotesInput(true);
    } else {
      setShowNotesInput(false);
      setNotes('');
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedFeedback) {
      logAnalyticsEvent(ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, {
        feedbackType: selectedFeedback,
      });
      onSubmit(selectedFeedback, notes.trim() || undefined);
    }
  }, [selectedFeedback, notes, onSubmit]);

  const handleSkip = useCallback(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.FEEDBACK_SKIPPED);
    onSkip();
  }, [onSkip]);

  const getFeedbackEmoji = (type: FeedbackType) => {
    switch (type) {
      case 'great':
        return '😊';
      case 'mild_side_effects':
        return '😐';
      case 'something_wrong':
        return '😟';
      default:
        return '';
    }
  };

  const getFeedbackLabel = (type: FeedbackType) => {
    switch (type) {
      case 'great':
        return 'Great';
      case 'mild_side_effects':
        return 'Mild side effects';
      case 'something_wrong':
        return 'Something felt wrong';
      default:
        return '';
    }
  };

  const nextActionText = context.nextAction === 'new_dose' ? 'new dose' : 'scan again';

  return (
    <ScrollView contentContainerStyle={[styles.container, isMobileWeb && styles.containerMobile]}>
      <View style={[styles.headerContainer, isMobileWeb && styles.headerContainerMobile]}>
        <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>How did this dose feel?</Text>
        <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
          Optional feedback to help track your experience
        </Text>
      </View>

      <View style={[styles.feedbackOptions, isMobileWeb && styles.feedbackOptionsMobile]}>
        {(['great', 'mild_side_effects', 'something_wrong'] as FeedbackType[]).map((feedbackType) => (
          <TouchableOpacity
            key={feedbackType}
            style={[
              styles.feedbackOption,
              selectedFeedback === feedbackType && styles.feedbackOptionSelected,
              isMobileWeb && styles.feedbackOptionMobile,
            ]}
            onPress={() => handleFeedbackSelect(feedbackType)}
          >
            <Text style={styles.feedbackEmoji}>{getFeedbackEmoji(feedbackType)}</Text>
            <Text
              style={[
                styles.feedbackText,
                selectedFeedback === feedbackType && styles.feedbackTextSelected,
              ]}
            >
              {getFeedbackLabel(feedbackType)}
            </Text>
            {selectedFeedback === feedbackType && (
              <CheckCircle color="#10B981" size={20} style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {showNotesInput && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Care to share more details? (Optional)</Text>
          <TextInput
            style={[styles.notesInput, isMobileWeb && styles.notesInputMobile]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Brief description of what felt wrong..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.characterCount}>{notes.length}/200</Text>
        </View>
      )}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.skipButton, isMobileWeb && styles.skipButtonMobile]}
          onPress={handleSkip}
        >
          <X color="#6b7280" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.skipButtonText}>Skip & continue to {nextActionText}</Text>
        </TouchableOpacity>

        {selectedFeedback && (
          <TouchableOpacity
            style={[styles.submitButton, isMobileWeb && styles.submitButtonMobile]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit & continue to {nextActionText}</Text>
            <ChevronRight color="#fff" size={18} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          This feedback is for your personal tracking only and won't affect future dose calculations.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
  },
  containerMobile: {
    padding: 16, // Reduced padding for small screens
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerContainerMobile: {
    marginBottom: 20, // Reduced margin for small screens
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleMobile: {
    fontSize: 20, // Smaller title for small screens
    marginBottom: 6, // Reduced margin
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  subtitleMobile: {
    fontSize: 14, // Smaller subtitle for small screens
  },
  feedbackOptions: {
    marginBottom: 20,
  },
  feedbackOptionsMobile: {
    marginBottom: 16, // Reduced margin for small screens
  },
  feedbackOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  feedbackOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: '#f0fdf4',
  },
  feedbackOptionMobile: {
    minHeight: 60,
  },
  feedbackEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  feedbackText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  feedbackTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  notesContainer: {
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 12,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  notesInputMobile: {
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonsContainer: {
    marginTop: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  skipButtonMobile: {
    minHeight: 48,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 14,
  },
  submitButtonMobile: {
    minHeight: 48,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});