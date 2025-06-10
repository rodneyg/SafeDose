import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

interface LogLimitModalProps {
  visible: boolean;
  isAnonymous: boolean;
  isPremium?: boolean;
  onClose: () => void;
  onContinueWithoutSaving: () => void;
}

export default function LogLimitModal({ 
  visible, 
  isAnonymous, 
  isPremium = false, 
  onClose,
  onContinueWithoutSaving 
}: LogLimitModalProps) {
  const router = useRouter();

  console.log('[LogLimitModal] Rendering', { visible, isAnonymous, isPremium });

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_VIEW, { type: 'log_limit' });
    }
  }, [visible]);

  const handleUpgrade = () => {
    console.log('[LogLimitModal] Upgrade to Pro button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'upgrade_pro', type: 'log_limit' });
    router.push('/pricing');
    onClose();
  };

  const handleContinueWithoutSaving = () => {
    console.log('[LogLimitModal] Continue without saving pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'continue_without_saving', type: 'log_limit' });
    onContinueWithoutSaving();
    onClose();
  };

  const handleCancel = () => {
    console.log('[LogLimitModal] Cancel button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'cancel', type: 'log_limit' });
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
            Unlock Your Full Dosing History
          </Text>
          <Text style={styles.message}>
            You've become a SafeDose power user! Upgrade to Pro to unlock unlimited logs, access the AI vial scanner, and support the ongoing development of the tool.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleContinueWithoutSaving}>
              <Text style={styles.secondaryButtonText}>Continue without saving</Text>
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
  upgradeButton: {
    backgroundColor: '#34C759',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});