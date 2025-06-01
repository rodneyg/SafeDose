import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface VolumeErrorModalProps {
  visible: boolean;
  onClose: () => void;
  onReEnterVialData: () => void;
}

export default function VolumeErrorModal({ visible, onClose, onReEnterVialData }: VolumeErrorModalProps) {
  console.log('[VolumeErrorModal] Rendering', { visible });

  const handleReEnterVialData = () => {
    console.log('[VolumeErrorModal] Re-enter Vial Data button pressed');
    // Add any analytics logging here if needed in the future
    onReEnterVialData();
  };

  const handleCancel = () => {
    console.log('[VolumeErrorModal] Cancel button pressed');
    // Add any analytics logging here if needed in the future
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
          <Text style={styles.title}>Warning: Unsafe Dose Volume</Text>
          <Text style={styles.message}>
            Warning: This dose is outside of safe volume thresholds. Please verify vial concentration and protocol.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.reEnterButton]} onPress={handleReEnterVialData}>
              <Text style={styles.buttonText}>Re-enter Vial Data</Text>
            </TouchableOpacity>
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
    color: '#000000', // Black color for title
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#333333', // Dark gray for message
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
  reEnterButton: {
    backgroundColor: '#FF9500', // Orange color for warning/re-enter
  },
  cancelButton: {
    backgroundColor: '#8E8E93', // Standard cancel color
  },
  buttonText: {
    color: '#FFFFFF', // White text for buttons
    fontSize: 16,
    fontWeight: '600',
  },
});
