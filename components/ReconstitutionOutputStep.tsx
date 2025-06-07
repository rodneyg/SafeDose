import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calculator, RotateCcw, Syringe } from 'lucide-react-native';
import { ReconstitutionPlannerResult } from '../lib/hooks/useReconstitutionPlanner';

interface Props {
  result: ReconstitutionPlannerResult;
  peptideAmount: string;
  peptideUnit: 'mg' | 'mcg';
  bacWater: string;
  targetDose: string;
  targetDoseUnit: 'mg' | 'mcg';
  onUseDoseCalculator: () => void;
  onStartOver: () => void;
}

export default function ReconstitutionOutputStep({
  result,
  peptideAmount,
  peptideUnit,
  bacWater,
  targetDose,
  targetDoseUnit,
  onUseDoseCalculator,
  onStartOver,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Reconstitution Plan</Text>
      
      {/* Input Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Your Inputs</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Peptide amount:</Text>
          <Text style={styles.summaryValue}>{peptideAmount} {peptideUnit}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>BAC water:</Text>
          <Text style={styles.summaryValue}>{bacWater} mL</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Target dose:</Text>
          <Text style={styles.summaryValue}>{targetDose} {targetDoseUnit}</Text>
        </View>
      </View>

      {/* Results */}
      <View style={styles.resultsCard}>
        <Text style={styles.cardTitle}>Results</Text>
        
        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>Your concentration:</Text>
          <Text style={styles.resultValue}>
            {result.concentration.toFixed(3)} mg/mL
          </Text>
        </View>

        <View style={styles.resultItem}>
          <Text style={styles.resultLabel}>To get {targetDose} {targetDoseUnit}, draw:</Text>
          <Text style={[styles.resultValue, styles.primaryResult]}>
            {result.drawVolume.toFixed(3)} mL
          </Text>
        </View>

        {/* Visual guide */}
        <View style={styles.visualGuide}>
          <Syringe color="#007AFF" size={24} />
          <Text style={styles.visualText}>
            Draw {result.drawVolume.toFixed(3)} mL from your reconstituted solution
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={onUseDoseCalculator}
        >
          <Calculator color="#fff" size={20} />
          <Text style={styles.primaryActionText}>Use in Dose Calculator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={onStartOver}
        >
          <RotateCcw color="#007AFF" size={18} />
          <Text style={styles.secondaryActionText}>Start Over</Text>
        </TouchableOpacity>
      </View>

      {/* Safety note */}
      <View style={styles.safetyNote}>
        <Text style={styles.safetyText}>
          ⚠️ Always double-check your calculations and consult with a healthcare professional before administering any medication.
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
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  resultsCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  resultItem: {
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 14,
    color: '#0369A1',
    marginBottom: 4,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0C4A6E',
  },
  primaryResult: {
    fontSize: 24,
    color: '#007AFF',
  },
  visualGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 12,
  },
  visualText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  secondaryActionText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  safetyNote: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  safetyText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});