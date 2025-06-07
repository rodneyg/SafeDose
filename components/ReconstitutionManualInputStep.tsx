import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface Props {
  peptideAmount: string;
  onChangePeptideAmount: (amount: string) => void;
  peptideUnit: 'mg' | 'mcg';
  onChangePeptideUnit: (unit: 'mg' | 'mcg') => void;
  targetDose: string;
  onChangeTargetDose: (dose: string) => void;
  targetDoseUnit: 'mg' | 'mcg';
  onChangeTargetDoseUnit: (unit: 'mg' | 'mcg') => void;
  preferredVolume: string;
  onChangePreferredVolume: (volume: string) => void;
  scannedPeptideAmount: string | null;
  error: string | null;
}

export default function ReconstitutionManualInputStep({
  peptideAmount,
  onChangePeptideAmount,
  peptideUnit,
  onChangePeptideUnit,
  targetDose,
  onChangeTargetDose,
  targetDoseUnit,
  onChangeTargetDoseUnit,
  preferredVolume,
  onChangePreferredVolume,
  scannedPeptideAmount,
  error,
}: Props) {
  const displayPeptideAmount = scannedPeptideAmount || peptideAmount;
  const isScanned = !!scannedPeptideAmount;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan Your Reconstitution</Text>
      <Text style={styles.subtitle}>
        Tell us your target dose and we'll calculate how much BAC water to add to your vial.
      </Text>
      
      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Target Dose */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>What dose do you want per injection?</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputWithUnitInput]}
            placeholder="250"
            placeholderTextColor="#9CA3AF"
            value={targetDose}
            onChangeText={onChangeTargetDose}
            keyboardType="numeric"
          />
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, targetDoseUnit === 'mg' && styles.unitButtonSelected]}
              onPress={() => onChangeTargetDoseUnit('mg')}
            >
              <Text style={[styles.unitButtonText, targetDoseUnit === 'mg' && styles.unitButtonTextSelected]}>
                mg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, targetDoseUnit === 'mcg' && styles.unitButtonSelected]}
              onPress={() => onChangeTargetDoseUnit('mcg')}
            >
              <Text style={[styles.unitButtonText, targetDoseUnit === 'mcg' && styles.unitButtonTextSelected]}>
                mcg
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.helpText}>
          Common doses: 250mcg, 500mcg, 1mg, 2.5mg
        </Text>
      </View>

      {/* Preferred Volume */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>How much do you want to inject per dose?</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputWithUnitInput]}
            placeholder="0.1"
            placeholderTextColor="#9CA3AF"
            value={preferredVolume}
            onChangeText={onChangePreferredVolume}
            keyboardType="numeric"
          />
          <View style={styles.unitLabel}>
            <Text style={styles.unitLabelText}>mL</Text>
          </View>
        </View>
        <Text style={styles.helpText}>
          This helps us calculate how much BAC water to add so your dose is easy to measure on your syringe. Defaults to 0.1mL.
        </Text>
      </View>

      {/* Peptide Amount */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>How much peptide is in your vial?</Text>
        {isScanned && (
          <Text style={styles.scannedHint}>
            Detected from scan: {scannedPeptideAmount} mg
          </Text>
        )}
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputWithUnitInput, isScanned && styles.inputScanned]}
            placeholder="5"
            placeholderTextColor="#9CA3AF"
            value={displayPeptideAmount}
            onChangeText={isScanned ? undefined : onChangePeptideAmount}
            keyboardType="numeric"
            editable={!isScanned}
          />
          <View style={styles.unitSelector}>
            <TouchableOpacity
              style={[styles.unitButton, peptideUnit === 'mg' && styles.unitButtonSelected]}
              onPress={() => onChangePeptideUnit('mg')}
            >
              <Text style={[styles.unitButtonText, peptideUnit === 'mg' && styles.unitButtonTextSelected]}>
                mg
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, peptideUnit === 'mcg' && styles.unitButtonSelected]}
              onPress={() => onChangePeptideUnit('mcg')}
            >
              <Text style={[styles.unitButtonText, peptideUnit === 'mcg' && styles.unitButtonTextSelected]}>
                mcg
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.helpText}>
          Common vial sizes: 2mg, 5mg, 10mg
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  scannedHint: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  input: {
    backgroundColor: '#fff',
    color: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inputWithUnitInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  inputScanned: {
    backgroundColor: '#F0FDF4',
    color: '#059669',
  },
  unitSelector: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5EA',
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  unitButtonSelected: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  unitButtonTextSelected: {
    color: '#fff',
  },
  unitLabel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E5EA',
  },
  unitLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});