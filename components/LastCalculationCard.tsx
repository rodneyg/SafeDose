import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LastCalculation } from '../lib/hooks/useLastCalculation';

export default function LastCalculationCard({ calculation }: { calculation: LastCalculation }) {
  return (
    <View style={styles.lastCalculation}>
      <Text accessibilityRole="header" style={styles.lastCalculationTitle}>Last calculation</Text>
      {calculation.vial && <Text style={styles.lastCalculationText}>Vial strength: {calculation.vial}</Text>}
      {calculation.solutionVolume && (
        <Text style={styles.lastCalculationText}>Water / solution volume: {calculation.solutionVolume}</Text>
      )}
      <Text style={styles.lastCalculationText}>Dose: {calculation.dose}</Text>
      <Text style={styles.lastCalculationText}>{calculation.draw}</Text>
      <Text style={styles.lastCalculationNote}>Check your current vial and syringe before reusing these values.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  lastCalculation: {
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 3,
    width: '100%',
    maxWidth: 360,
  },
  lastCalculationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  lastCalculationText: {
    fontSize: 14,
    color: '#1F2937',
  },
  lastCalculationNote: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 4,
  },
});
