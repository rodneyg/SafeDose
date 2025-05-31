import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { CheckCircle, ArrowLeftCircle } from 'lucide-react-native'; // Or other icons you prefer

type Props = {
  substanceName: string;
  concentrationAmount: string;
  concentrationUnit: string;
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  calculatedVolume: number | null;
  onConfirm: () => void;
  onGoBack: () => void;
  isMobileWeb?: boolean; // Optional prop for styling consistency
};

export default function ConfirmationScreen({
  substanceName,
  concentrationAmount,
  concentrationUnit,
  doseValue,
  unit,
  calculatedVolume,
  onConfirm,
  onGoBack,
  isMobileWeb,
}: Props) {
  const displayConcentration = concentrationAmount && concentrationUnit ? `${concentrationAmount} ${concentrationUnit}` : 'N/A';
  const displayDoseToDraw = calculatedVolume !== null ? `${calculatedVolume.toFixed(2)} mL` : 'N/A';
  const displayDoseOrdered = doseValue && unit ? `${doseValue} ${unit}` : 'N/A';

  // Warning logic
  const doseVolumeWarning = calculatedVolume !== null && (calculatedVolume > 1 || calculatedVolume < 0.01)
    ? `Warning: Dose volume (${displayDoseToDraw}) is outside the typical range of 0.01-1.0 mL. Please double-check calculations.`
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Confirm Dose Details</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Dose Summary</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Compound Name:</Text>
          <Text style={styles.summaryValue}>{substanceName || 'N/A'}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Concentration:</Text>
          <Text style={styles.summaryValue}>{displayConcentration}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Dose Ordered:</Text>
          <Text style={styles.summaryValue}>{displayDoseOrdered}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Calculated Volume to Draw:</Text>
          <Text style={styles.summaryValueBold}>{displayDoseToDraw}</Text>
        </View>
      </View>

      {doseVolumeWarning && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important Warning</Text>
          <Text style={styles.warningText}>{doseVolumeWarning}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.goBackButton, isMobileWeb && styles.actionButtonMobile]}
          onPress={onGoBack}
        >
          <ArrowLeftCircle color="#fff" size={18} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.confirmButton, isMobileWeb && styles.actionButtonMobile]}
          onPress={onConfirm}
        >
          <CheckCircle color="#fff" size={18} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Confirm Dose</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F2F2F7', // Match screen background
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    paddingBottom: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#3A3A3C',
    flex: 1,
  },
  summaryValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryValueBold: {
    fontSize: 16,
    color: '#007AFF', // Highlight color
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  warningCard: {
    backgroundColor: '#FFF3CD', // Warning yellow
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FFCC00', // Darker yellow for border
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404', // Dark yellow text
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10, // Reduced margin
    gap: 10, // Add gap between buttons
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 50, // Ensure consistent button height
  },
  actionButtonMobile: { // For better touch targets on mobile web
    paddingVertical: 16,
    minHeight: 60,
  },
  goBackButton: {
    backgroundColor: '#FF3B30', // Red for back/cancel
  },
  confirmButton: {
    backgroundColor: '#34C759', // Green for confirm
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600', // Bolder text
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
