import React from 'react';
import { Modal, View, ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import UpgradeEmailForm from './UpgradeEmailForm';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface LimitModalProps {
  visible: boolean;
  isAnonymous: boolean;
  isPremium?: boolean;
  onClose: () => void;
  getEmailCaptureToken?: () => Promise<string>;
}

export default function LimitModal({ visible, isAnonymous, isPremium = false, onClose, getEmailCaptureToken }: LimitModalProps) {
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

  const handleUpgrade = () => {
    console.log('[LimitModal] Upgrade button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'upgrade' });
    router.push('/pricing');
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
        <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>
            {isAnonymous ? 'Free Scan Limit Reached' : 'Plan Limit Reached'}
          </Text>
          <Text style={styles.message}>
            {isAnonymous
              ? 'You’ve used all 3 free scans. You can keep using manual entry or view upgrade options.'
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
          {visible && !isPremium && getEmailCaptureToken && (
            <UpgradeEmailForm getIdToken={getEmailCaptureToken} onClose={onClose} />
          )}
        </ScrollView>
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
    flexGrow: 0,
    maxHeight: '90%',
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    padding: 24,
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