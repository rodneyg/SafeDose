import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface LimitModalProps {
  visible: boolean;
  isAnonymous: boolean;
  onClose: () => void;
}

export default function LimitModal({ visible, isAnonymous, onClose }: LimitModalProps) {
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/login');
    onClose();
  };

  const handleUpgrade = () => {
    router.push('/pricing');
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
            {isAnonymous
              ? 'Usage Limit Reached'
              : 'Free Plan Limit Reached'}
          </Text>
          <Text style={styles.message}>
            {isAnonymous
              ? 'You\'ve used all 5 free scans. Sign in to get 15 scans/month or upgrade for more.'
              : 'You\'ve used all 15 free scans. Upgrade to continue.'}
          </Text>
          <View style={styles.buttonContainer}>
            {isAnonymous && (
              <TouchableOpacity style={styles.button} onPress={handleSignIn}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.button} onPress={handleUpgrade}>
              <Text style={styles.buttonText}>Upgrade</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});