import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import type { ScanResult } from '../lib/scan';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string;
  scanResult: ScanResult | null;
  onRetake: () => void;
  onVerify: () => void;
}

function ScanSection({ title, fields }: { title: string; fields: [string, string | null][] }) {
  return (
    <View style={styles.scanSection}>
      <Text style={styles.scanSectionTitle}>{title}</Text>
      {fields.map(([label, value]) => (
        <View key={label} style={styles.scanRow}>
          <Text style={styles.scanLabel}>{label}</Text>
          <Text style={styles.scanValue}>{value ?? 'Not detected'}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ImagePreviewModal({
  visible,
  imageUri,
  scanResult,
  onRetake,
  onVerify,
}: ImagePreviewModalProps) {
  if (!visible || !scanResult) return null;

  const { syringe, vial } = scanResult;
  const imageHeight = Math.min(Dimensions.get('window').height * 0.5, 300);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onRetake}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Review Your Scan</Text>
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Text style={styles.message}>
              Read the fill line on your own syringe and verify the detected details against your syringe
              and vial label. The scan provides no medical advice.
            </Text>
            {imageUri ? (
              <View style={[styles.imageContainer, { height: imageHeight }]}>
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
              </View>
            ) : null}
            <View style={styles.scanResultsContainer}>
              <Text style={styles.scanResultsTitle}>Detected Information</Text>
              <ScanSection title="Syringe" fields={[
                ['Type', syringe.type], ['Capacity', syringe.volume], ['Scale', syringe.scale],
              ]} />
              <ScanSection title="Vial" fields={[
                ['Substance', vial.substance], ['Total amount', vial.totalAmount],
                ['Concentration', vial.concentration], ['Expiration', vial.expiration],
              ]} />
            </View>
          </ScrollView>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.retakeButton]}
              onPress={onRetake}
              accessibilityLabel="Retake photo"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={onVerify}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>I checked both</Text>
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
    maxHeight: '90%',
    alignItems: 'center',
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
    maxHeight: '80%',
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
