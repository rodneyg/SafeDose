import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface LimitModalProps {
  visible: boolean;
  isAnonymous: boolean;
  isPremium?: boolean;
  onClose: () => void;
}

export default function LimitModal({ visible, isAnonymous, isPremium = false, onClose }: LimitModalProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState('');

  console.log('[LimitModal] Rendering', { visible, isAnonymous, isPremium });
  console.log('[LimitModal] Modal should display:', visible);

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_VIEW);
    }
  }, [visible]);

  const handleUpgrade = () => {
    console.log('[LimitModal] Upgrade to Pro button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { 
      action: 'upgrade_pro',
      feedback: feedback.trim() || null
    });
    router.push('/pricing');
    onClose();
  };

  const handleKeepManual = () => {
    console.log('[LimitModal] Keep using manual mode button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { 
      action: 'keep_manual_mode',
      feedback: feedback.trim() || null
    });
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            You've used your 3 free photo scans
          </Text>
          <Text style={styles.message}>
            Upgrade to Pro for unlimited AI scans and dose logs.
          </Text>
          
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackLabel}>
              What would make this worth paying for? (optional)
            </Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Your feedback..."
              multiline={false}
              maxLength={100}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.manualButton]} onPress={handleKeepManual}>
              <Text style={styles.manualButtonText}>Keep using manual mode (free)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000, // Higher than loading overlay (1000)
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  feedbackContainer: {
    width: '100%',
    marginBottom: 24,
  },
  feedbackLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButton: {
    backgroundColor: '#34C759',
  },
  manualButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  manualButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});