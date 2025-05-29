import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { CameraIcon, Plus, X, Info } from 'lucide-react-native';
import SyringeIllustration from './SyringeIllustration';
import { syringeOptions } from "../lib/utils";

type Props = {
  calculationError: string | null;
  recommendedMarking: string | null;
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units';
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Add concentrationUnit prop
  substanceName: string;
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration prop
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  isMobileWeb: boolean;
};

export default function FinalResultDisplay({
  calculationError,
  recommendedMarking,
  doseValue,
  unit,
  concentrationUnit,
  substanceName,
  manualSyringe,
  calculatedVolume,
  calculatedConcentration,
  handleStartOver,
  setScreenStep,
  isMobileWeb,
}: Props) {
  console.log('[FinalResultDisplay] Rendering with:', { 
    calculationError, 
    recommendedMarking,
    doseValue,
    unit,
    substanceName,
    manualSyringe,
    calculatedVolume,
    calculatedConcentration
  });
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {calculationError && !recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171', flexDirection: 'column', alignItems: 'center' }]}>
          <X color="#f87171" size={24} style={{ marginBottom: 10 }} />
          <Text style={styles.errorTitle}>Calculation Error</Text>
          <Text style={styles.errorText}>{calculationError}</Text>
          <Text style={styles.errorHelpText}>
            {calculationError.includes('exceeds total amount') && 
              'Try reducing the dose amount or selecting a medication with a higher total amount.'}
            {calculationError.includes('exceeds what can be made') && 
              'Try selecting a medication with a higher concentration or total amount.'}
            {calculationError.includes('exceeds syringe capacity') && 
              'Try selecting a syringe with a larger capacity or reducing the dose amount.'}
          </Text>
        </View>
      )}
      {!calculationError && !recommendedMarking && (
        <View style={[styles.instructionCard, { backgroundColor: '#EFF6FF', borderColor: '#60A5FA' }]}>
          <Text style={[styles.instructionTitle, { color: '#1E40AF' }]}>
            Dose Calculation
          </Text>
          <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
            {doseValue ? `For ${doseValue} ${unit} dose` : 'For the requested dose'} 
            {substanceName ? ` of ${substanceName}` : ''}:
          </Text>
          <Text style={[styles.instructionTextLarge, { color: '#1E40AF' }]}>
            No specific recommendation available
          </Text>
          <Text style={[styles.instructionNote, { color: '#1E40AF' }]}>
            Please check your inputs and try again, or consult a healthcare professional.
          </Text>
        </View>
      )}
      {recommendedMarking && (
        <View style={[styles.instructionCard, calculationError ? { backgroundColor: '#FEF3C7', borderColor: '#FBBF24' } : { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
          <Text style={styles.instructionTitle}>
            {calculationError ? '⚠️ Dose Recommendation' : '✅ Dose Calculation Result'}
          </Text>
          <Text style={styles.instructionText}>
            For a {doseValue} {unit} dose of {substanceName || 'this medication'}:
          </Text>
          <Text style={styles.instructionTextLarge}>
            Draw up to the {recommendedMarking} mark
          </Text>
          <Text style={styles.instructionNote}>
            ({manualSyringe.type === 'Insulin' ? 'Units mark on Insulin Syringe' : 'ml mark on Standard Syringe'})
          </Text>
          {calculatedVolume !== null && calculatedVolume !== undefined && (
            <Text style={styles.instructionNote}>
              (Exact calculated volume: {calculatedVolume.toFixed(2)} ml)
            </Text>
          )}
          {calculatedConcentration !== null && calculatedConcentration !== undefined && (
            <Text style={styles.instructionNote}>
              (Calculated concentration: {calculatedConcentration.toFixed(2)} {concentrationUnit || 'mg/mL'})
            </Text>
          )}
          {calculationError && (
            <Text style={styles.warningText}>{calculationError}</Text>
          )}
          <View style={styles.illustrationContainer}>
            <Text style={styles.instructionNote}>Syringe Illustration (recommended mark highlighted)</Text>
            <SyringeIllustration
              syringeType={manualSyringe.type}
              syringeVolume={manualSyringe.volume}
              recommendedMarking={recommendedMarking}
              syringeOptions={syringeOptions}
            />
          </View>
        </View>
      )}
      <View style={styles.disclaimerContainer}>
        <View style={styles.disclaimerIconContainer}>
          <Info color={'#856404'} size={14} style={styles.disclaimerIcon} />
          <Text style={styles.disclaimerText}>
            **Critical**: Double-check this calculated dose with a healthcare professional before administration. This result is for informational purposes only and should not replace professional medical judgment. Verify all calculations independently to ensure patient safety.
          </Text>
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }, isMobileWeb && styles.actionButtonMobile]} onPress={handleStartOver}>
          <Plus color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>New Dose</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6' }, isMobileWeb && styles.actionButtonMobile]} onPress={() => setScreenStep('scan')}>
          <CameraIcon color="#fff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  instructionCard: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16, width: '100%' },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 15, color: '#065F46', textAlign: 'center', marginBottom: 8 },
  instructionTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginVertical: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6 },
  instructionNote: { fontSize: 13, color: '#065F46', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  warningText: { fontSize: 13, color: '#92400E', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center' },
  illustrationContainer: { marginTop: 20, alignItems: 'center' },
  disclaimerContainer: { 
    backgroundColor: '#FFF3CD', 
    padding: 12, 
    borderRadius: 8, 
    marginVertical: 10, 
    width: '90%', 
    alignSelf: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#856404',
  },
  disclaimerIconContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    marginRight: 8,
    marginTop: 3,
  },
  disclaimerText: { 
    fontSize: 12, 
    color: '#856404', 
    textAlign: 'left', 
    fontStyle: 'italic',
    flex: 1,
  },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 10 },
  actionButton: { paddingVertical: 14, borderRadius: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, minHeight: 50 },
  actionButtonMobile: { paddingVertical: 16, minHeight: 60 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  errorTitle: { fontSize: 16, color: '#991B1B', textAlign: 'center', fontWeight: '600', marginVertical: 8 },
  errorText: { fontSize: 15, color: '#991B1B', textAlign: 'center', fontWeight: '500', marginLeft: 8, flexShrink: 1 },
  errorHelpText: { fontSize: 13, color: '#991B1B', textAlign: 'center', marginTop: 12, paddingVertical: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingHorizontal: 12, borderRadius: 6, width: '90%', alignSelf: 'center' },
});