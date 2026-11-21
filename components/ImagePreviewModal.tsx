import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { mapScanToDoseInputs, type ScanResult } from '../lib/scan';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string;
  scanResult: ScanResult | null;
  onRetake: () => void;
  onVerify: (substance: string | null) => void;
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
  scanResult,
  ...props
}: ImagePreviewModalProps) {
  if (!visible || !scanResult) return null;
  return <ScanReview {...props} scanResult={scanResult} />;
}

function ScanReview({ imageUri, scanResult, onRetake, onVerify }:
  Omit<ImagePreviewModalProps, 'visible' | 'scanResult'> & { scanResult: ScanResult }) {
  const { syringe, vial } = scanResult;
  const { manualSyringe } = mapScanToDoseInputs(scanResult).inputs;
  const [editedSubstance, setEditedSubstance] = useState<string | null>(null);
  const substance = editedSubstance?.trim() ?? vial.substance;
  const needsSubstanceReview = Boolean(manualSyringe) && vial.substance !== null;
  const canVerify = !needsSubstanceReview || Boolean(substance);
  const verificationLabel = needsSubstanceReview ? 'Confirm substance and all details' : 'I checked both';
  const imageHeight = Math.min(Dimensions.get('window').height * 0.5, 300);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onRetake}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Review Your Scan</Text>
          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                ['Type', syringe.type], ['Capacity', manualSyringe?.volume ?? 'Check the label and select manually'], ['Scale', syringe.scale],
              ]} />
              <ScanSection title="Vial" fields={[
                ['Total amount', vial.totalAmount],
                ['Concentration', vial.concentration], ['Expiration', vial.expiration],
              ]} />
              {vial.substance !== null ? (
                <View>
                  <Text style={styles.scanLabel}>Unconfirmed vial substance</Text>
                  {editedSubstance === null ? (
                    <View style={styles.scanRow}>
                      <Text style={styles.substanceName}>{vial.substance}</Text>
                      {manualSyringe ? (
                        <TouchableOpacity
                          style={styles.editButton}
                          accessibilityRole="button"
                          accessibilityLabel="Edit vial substance"
                          onPress={() => setEditedSubstance(vial.substance)}
                        >
                          <Text style={styles.editText}>Edit</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : (
                    <TextInput
                      autoFocus
                      accessibilityLabel="Vial substance"
                      style={styles.substanceInput}
                      value={editedSubstance}
                      onChangeText={setEditedSubstance}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.scanRow}>
                  <Text style={styles.scanLabel}>Substance</Text>
                  <Text style={styles.scanValue}>Not detected</Text>
                </View>
              )}
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
              style={[styles.button, styles.continueButton, !canVerify && styles.disabledButton]}
              disabled={!canVerify}
              accessibilityState={{ disabled: !canVerify }}
              onPress={() => { if (canVerify) onVerify(manualSyringe ? substance : null); }}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>
                {manualSyringe ? verificationLabel : 'Enter details manually'}
              </Text>
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
  substanceName: {
    color: '#333333',
    flex: 1,
    fontSize: 16,
    alignSelf: 'center',
  },
  editButton: {
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  editText: {
    color: '#005BBB',
    fontWeight: '600',
  },
  substanceInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#8E8E93',
    borderWidth: 1,
    borderRadius: 8,
    color: '#000000',
    padding: 10,
    marginTop: 8,
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
    paddingHorizontal: 8,
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
  disabledButton: {
    backgroundColor: '#6D6D72',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
