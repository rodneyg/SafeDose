import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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

  console.log('[LimitModal] Rendering', { visible, isAnonymous, isPremium });

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_VIEW);
    }
  }, [visible]);

  const handleSignIn = () => {
    console.log('[LimitModal] Sign In button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'sign_in' });
    router.push('/login');
    onClose();
  };

  const handleCancel = () => {
    console.log('[LimitModal] Cancel button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'cancel' });
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
            {isAnonymous ? 'Free Scan Limit Reached' : 'Scan Limit Reached'}
          </Text>
          <Text style={styles.message}>
            {isAnonymous
              ? "You've used your free scans for this session. Sign in to continue using SafeDose and save your dose history."
              : "You've reached your scan limit for this period. SafeDose is committed to long-term safety and reliability. Your usage helps us improve the system for everyone."}
          </Text>
          <View style={styles.buttonContainer}>
            {isAnonymous && (
              <TouchableOpacity style={[styles.button, styles.signInButton]} onPress={handleSignIn}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
              <Text style={styles.buttonText}>OK</Text>
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
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
