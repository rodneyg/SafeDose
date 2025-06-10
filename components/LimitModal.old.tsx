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
            {isAnonymous ? 'Free Scan Limit Reached' : 'Plan Limit Reached'}
          </Text>
          <Text style={styles.message}>
            {isAnonymous
              ? 'You’ve used all 3 free scans. Sign in to get 10 scans per month or upgrade for more.'
              : 'You’ve reached your plan’s scan limit. Upgrade to a premium plan for additional scans.'}
          </Text>
          <View style={styles.buttonContainer}>
            {isAnonymous && (
              <TouchableOpacity style={[styles.button, styles.signInButton]} onPress={handleSignIn}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
            )}
            {!isPremium && (
              <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
                <Text style={styles.buttonText}>Upgrade</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
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
  signInButton: {
    backgroundColor: '#007AFF',
  },
  upgradeButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});