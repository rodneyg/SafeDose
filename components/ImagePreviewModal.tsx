import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string;
  onRetake: () => void;
  onContinue: () => void;
  autoAdvanceDelay?: number; // in milliseconds, default 4000 (4 seconds)
}

export default function ImagePreviewModal({ 
  visible, 
  imageUri, 
  onRetake, 
  onContinue,
  autoAdvanceDelay = 4000
}: ImagePreviewModalProps) {
  const [countdown, setCountdown] = useState<number>(autoAdvanceDelay / 1000);
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(autoAdvanceDelay / 1000);
      setUserInteracted(false);
      return;
    }

    if (userInteracted) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, userInteracted, autoAdvanceDelay, onContinue]);

  const handleRetake = () => {
    setUserInteracted(true);
    onRetake();
  };

  const handleContinue = () => {
    setUserInteracted(true);
    onContinue();
  };

  if (!visible) return null;

  const screenDimensions = Dimensions.get('window');
  const imageHeight = Math.min(screenDimensions.height * 0.5, 300);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Image Captured</Text>
          
          {imageUri && (
            <View style={[styles.imageContainer, { height: imageHeight }]}>
              <Image 
                source={{ uri: imageUri }} 
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          )}
          
          <Text style={styles.message}>
            Review your captured image. Does it clearly show the syringe and vial?
          </Text>
          
          {!userInteracted && (
            <Text style={styles.countdown}>
              Auto-continuing in {countdown} seconds...
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.retakeButton]} 
              onPress={handleRetake}
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.continueButton]} 
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  countdown: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  retakeButton: {
    backgroundColor: '#8E8E93',
  },
  continueButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});