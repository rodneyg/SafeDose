import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';

interface ScanResult {
  syringe: {
    type: 'Insulin' | 'Standard' | 'unreadable' | null;
    volume: string | 'unreadable' | null;
    markings: string | 'unreadable' | null;
  };
  vial: {
    substance: string | 'unreadable' | null;
    totalAmount: string | 'unreadable' | null;
    concentration: string | 'unreadable' | null;
    expiration: string | 'unreadable' | null;
  };
  capturedImage?: {
    uri: string;
    mimeType: string;
  };
}

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string;
  scanResult?: ScanResult | null;
  onRetake: () => void;
  onContinue: () => void;
  autoAdvanceDelay?: number; // in milliseconds, default 15000 (15 seconds)
}

export default function ImagePreviewModal({ 
  visible, 
  imageUri, 
  scanResult,
  onRetake, 
  onContinue,
  autoAdvanceDelay = 15000
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

  // Helper function to format scan result values
  const formatValue = (value: string | 'unreadable' | null): string => {
    if (value === null) return 'Not detected';
    if (value === 'unreadable') return 'Unreadable';
    return value;
  };

  // Helper function to render scan result section
  const renderScanSection = (title: string, data: Record<string, any>) => {
    const hasData = Object.values(data).some(value => value !== null && value !== 'unreadable');
    
    return (
      <View style={styles.scanSection}>
        <Text style={styles.scanSectionTitle}>{title}</Text>
        {hasData ? (
          Object.entries(data).map(([key, value]) => {
            if (key === 'markings' && (!value || value === 'unreadable')) return null; // Skip markings if not useful
            return (
              <View key={key} style={styles.scanRow}>
                <Text style={styles.scanLabel}>
                  {key === 'type' ? 'Type' : 
                   key === 'volume' ? 'Volume' :
                   key === 'substance' ? 'Substance' :
                   key === 'totalAmount' ? 'Total Amount' :
                   key === 'concentration' ? 'Concentration' :
                   key === 'expiration' ? 'Expiration' : 
                   key.charAt(0).toUpperCase() + key.slice(1)}:
                </Text>
                <Text style={styles.scanValue}>{formatValue(value)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.noDataText}>No information detected</Text>
        )}
      </View>
    );
  };

  if (!visible) return null;

  const screenDimensions = Dimensions.get('window');
  // More conservative image height calculation to prevent overflow
  const imageHeight = Math.min(screenDimensions.height * 0.35, 250);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onContinue}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Review Your Scan</Text>
          
          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
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
              Review your captured image and detected information below:
            </Text>
            
            {scanResult && (
              <View style={styles.scanResultsContainer}>
                <Text style={styles.scanResultsTitle}>Detected Information</Text>
                {renderScanSection('Syringe', scanResult.syringe)}
                {renderScanSection('Vial', scanResult.vial)}
              </View>
            )}
            
            {!userInteracted && (
              <Text style={styles.countdown}>
                Auto-continuing in {countdown} seconds...
              </Text>
            )}
          </ScrollView>
          
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
    maxHeight: '85%',
    alignItems: 'center',
    overflow: 'hidden', // Prevent content overflow
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContainer: {
    width: '100%',
    maxHeight: '70%',
    overflow: 'scroll', // Ensure proper scrolling behavior
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
  scanResultsContainer: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  scanResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    textAlign: 'center',
  },
  scanSection: {
    marginBottom: 16,
  },
  scanSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  scanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  scanLabel: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    flex: 1,
    minWidth: 80,
  },
  scanValue: {
    fontSize: 14,
    color: '#666666',
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  noDataText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
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
    marginTop: 16,
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