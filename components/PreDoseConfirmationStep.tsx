import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react-native';

interface PreDoseConfirmationStepProps {
  substanceName: string;
  concentrationAmount: string;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  calculatedVolume: number | null;
  calculationError: string | null;
}

export default function PreDoseConfirmationStep({
  substanceName,
  concentrationAmount,
  concentrationUnit,
  doseValue,
  unit,
  calculatedVolume,
  calculationError,
}: PreDoseConfirmationStepProps) {
  const hasVolumeWarning = calculatedVolume !== null && calculatedVolume > 1;
  const hasError = calculationError !== null;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Pre-Dose Safety Review</Text>
        <Text style={styles.subtitle}>
          Please review the following dose calculation before proceeding
        </Text>
      </View>

      <View style={[styles.summaryCard, hasError ? styles.errorCard : styles.normalCard]}>
        <View style={styles.summaryHeader}>
          {hasError ? (
            <AlertTriangle color="#F59E0B" size={24} />
          ) : (
            <CheckCircle color="#10B981" size={24} />
          )}
          <Text style={[styles.summaryTitle, hasError && styles.warningText]}>
            Dose Summary
          </Text>
        </View>

        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Compound:</Text>
            <Text style={styles.summaryValue}>
              {substanceName || 'Not specified'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Concentration:</Text>
            <Text style={styles.summaryValue}>
              {concentrationAmount} {concentrationUnit}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Requested Dose:</Text>
            <Text style={styles.summaryValue}>
              {doseValue} {unit}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Volume to Draw:</Text>
            <Text style={[styles.summaryValue, hasVolumeWarning && styles.warningText]}>
              {calculatedVolume?.toFixed(2)} mL
              {hasVolumeWarning && ' ⚠️'}
            </Text>
          </View>
        </View>

        {hasVolumeWarning && (
          <View style={styles.warningContainer}>
            <AlertTriangle color="#F59E0B" size={16} />
            <Text style={styles.warningMessage}>
              Volume exceeds 1 mL. Please verify this dose with a healthcare professional.
            </Text>
          </View>
        )}

        {hasError && (
          <View style={styles.errorContainer}>
            <Info color="#DC2626" size={16} />
            <Text style={styles.errorMessage}>
              {calculationError}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.safetyContainer}>
        <View style={styles.safetyHeader}>
          <Info color="#6B7280" size={16} />
          <Text style={styles.safetyTitle}>Safety Reminder</Text>
        </View>
        <Text style={styles.safetyText}>
          Always double-check calculations with a healthcare professional before administration. 
          Verify the patient, medication, dose, route, and timing.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 20,
  },
  normalCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
  },
  errorCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  warningText: {
    color: '#F59E0B',
  },
  warningContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningMessage: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    lineHeight: 18,
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorMessage: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
    lineHeight: 18,
  },
  safetyContainer: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  safetyText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});