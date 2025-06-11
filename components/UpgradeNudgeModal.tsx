import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';

export type NudgeType = 'first_scan_complete' | 'first_logs_view' | 'pre_scan_limit' | 'manual_entry_only';

interface UpgradeNudgeModalProps {
  visible: boolean;
  nudgeType: NudgeType;
  onClose: () => void;
  onContinueWithAction?: () => void; // For pre-limit nudge, allows continuing with scan
  isOverCamera?: boolean; // Whether modal is shown over camera view
}

const getNudgeContent = (nudgeType: NudgeType) => {
  switch (nudgeType) {
    case 'first_scan_complete':
      return {
        title: '🎉 Great Scan!',
        message: 'Want unlimited scans and logs? Upgrade to SafeDose Pro.',
        upgradeText: 'Upgrade',
        dismissText: 'Not Now'
      };
    case 'first_logs_view':
      return {
        title: '📊 Your Data is Safe',
        message: 'Your data is saved for this session — go Pro to keep your logs across devices.',
        upgradeText: 'Upgrade',
        dismissText: 'Not Now'
      };
    case 'pre_scan_limit':
      return {
        title: '⚠️ Almost at Limit',
        message: '1 free scan left — unlock unlimited use with SafeDose Pro.',
        upgradeText: 'Upgrade',
        dismissText: 'Not Now'
      };
    case 'manual_entry_only':
      return {
        title: '🔬 Try AI Scanning',
        message: 'Take the guesswork out — scan your vials instantly with Pro.',
        upgradeText: 'Upgrade',
        dismissText: 'Not Now'
      };
    default:
      return {
        title: 'Upgrade to Pro',
        message: 'Get more features with SafeDose Pro.',
        upgradeText: 'Upgrade',
        dismissText: 'Not Now'
      };
  }
};

export default function UpgradeNudgeModal({ visible, nudgeType, onClose, onContinueWithAction, isOverCamera = false }: UpgradeNudgeModalProps) {
  const router = useRouter();
  const content = getNudgeContent(nudgeType);

  React.useEffect(() => {
    if (visible) {
      logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_NUDGE_VIEW, { nudge_type: nudgeType });
    }
  }, [visible, nudgeType]);

  const handleUpgrade = () => {
    console.log('[UpgradeNudgeModal] Upgrade button pressed', { nudgeType });
    logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_NUDGE_ACTION, { 
      action: 'upgrade', 
      nudge_type: nudgeType 
    });
    
    // Close the modal first to ensure smooth transition
    onClose();
    
    // Navigate to pricing after a brief delay to allow modal to close
    setTimeout(() => {
      router.push('/pricing');
    }, 100);
  };

  const handleDismiss = () => {
    console.log('[UpgradeNudgeModal] Dismiss button pressed', { nudgeType });
    logAnalyticsEvent(ANALYTICS_EVENTS.UPGRADE_NUDGE_ACTION, { 
      action: 'dismiss', 
      nudge_type: nudgeType 
    });
    
    // For pre-limit nudge, allow user to continue with scan if callback provided
    if (nudgeType === 'pre_scan_limit' && onContinueWithAction) {
      onContinueWithAction();
    }
    
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isOverCamera && styles.overlayOverCamera]}>
        <View style={styles.modal}>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.message}>{content.message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.upgradeButton]} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>{content.upgradeText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.dismissButton]} onPress={handleDismiss}>
              <Text style={styles.dismissButtonText}>{content.dismissText}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayOverCamera: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Much lighter overlay when over camera
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    // Add subtle shadow for better visibility over camera
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
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
  dismissButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
});