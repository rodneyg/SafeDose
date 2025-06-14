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
  triggerReason?: 'log_limit' | 'power_user_promotion';
}

export default function LogLimitModal({ 
  visible, 
  isAnonymous, 
  isPremium = false, 
  onClose,
  onContinueWithoutSaving,
  triggerReason = 'log_limit'
}: LogLimitModalProps) {
  const router = useRouter();

  console.log('[LogLimitModal] Rendering', { visible, isAnonymous, isPremium, triggerReason });

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_VIEW, { type: triggerReason });
    }
  }, [visible, triggerReason]);

  const handleUpgrade = () => {
    console.log('[LogLimitModal] Upgrade to Pro button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'upgrade_pro', type: triggerReason });
    router.push('/pricing');
    onClose();
  };

  const handleContinueWithoutSaving = () => {
    console.log('[LogLimitModal] Continue without saving pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'continue_without_saving', type: triggerReason });
    onContinueWithoutSaving();
    onClose();
  };

  const handleCancel = () => {
    console.log('[LogLimitModal] Cancel button pressed');
    logAnalyticsEvent(ANALYTICS_EVENTS.LIMIT_MODAL_ACTION, { action: 'cancel', type: triggerReason });
    onClose();
  };

  // Determine content based on trigger reason
  const isLogLimit = triggerReason === 'log_limit';
  const isPowerUserPromotion = triggerReason === 'power_user_promotion';

  const getTitle = () => {
    if (isPowerUserPromotion) {
      return "You've Become a SafeDose Power User!";
    }
    return "Dose History Storage Limit Reached";
  };

  const getMessage = () => {
    if (isPowerUserPromotion) {
      return "Great job on completing multiple doses! Upgrade to Pro to unlock unlimited logs, access the AI vial scanner, and support the ongoing development of the tool.";
    }
    return "You've reached your monthly dose logging limit. Upgrade to Pro to save unlimited dose logs, access the AI vial scanner, and support ongoing development.";
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
            {getTitle()}
          </Text>
          <Text style={styles.message}>
            {getMessage()}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
            {isLogLimit && (
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleContinueWithoutSaving}>
                <Text style={styles.secondaryButtonText}>Continue without saving</Text>
              </TouchableOpacity>
            )}
            {isPowerUserPromotion && (
              <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={onClose}>
                <Text style={styles.secondaryButtonText}>Maybe later</Text>
              </TouchableOpacity>
            )}
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