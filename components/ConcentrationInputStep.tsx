import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { validateUnitCompatibility } from '../lib/doseUtils';

type Props = {
  concentrationAmount: string;
  setConcentrationAmount: (amount: string) => void;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  setConcentrationHint: (hint: string | null) => void;
  concentrationHint: string | null;
  unit?: 'mg' | 'mcg' | 'units' | 'ml'; // Optional dose unit for validation
  setUnitCompatible?: (isCompatible: boolean) => void; // New prop to track compatibility
};

// Helper function to determine compatible concentration units
function getCompatibleConcentrationUnits(doseUnit: 'mg' | 'mcg' | 'units' | 'ml'): ('mg/ml' | 'mcg/ml' | 'units/ml')[] {
  if (doseUnit === 'ml') {
    // All units are compatible with volume-based doses
    return ['mg/ml', 'mcg/ml', 'units/ml'];
  }
  
  if (doseUnit === 'units') {
    return ['units/ml'];
  }
  
  if (doseUnit === 'mg') {
    return ['mg/ml', 'mcg/ml']; // mg is compatible with mg/ml and mcg/ml (with conversion)
  }
  
  if (doseUnit === 'mcg') {
    return ['mcg/ml', 'mg/ml']; // mcg is compatible with mcg/ml and mg/ml (with conversion)
  }
  
  return ['mg/ml', 'mcg/ml', 'units/ml']; // Fallback to all units
}

export default function ConcentrationInputStep({
  concentrationAmount,
  setConcentrationAmount,
  concentrationUnit,
  setConcentrationUnit,
  setConcentrationHint,
  concentrationHint,
  unit,
  setUnitCompatible = () => {},
}: Props) {
  // Track compatibility state
  const [isCompatible, setIsCompatible] = useState(true);
  const [compatibleUnits, setCompatibleUnits] = useState<('mg/ml' | 'mcg/ml' | 'units/ml')[]>(['mg/ml', 'mcg/ml', 'units/ml']);
  
  // Update compatible units when dose unit changes
  useEffect(() => {
    if (unit) {
      const newCompatibleUnits = getCompatibleConcentrationUnits(unit);
      setCompatibleUnits(newCompatibleUnits);
      
      // If current concentration unit is not compatible, auto-switch to the first compatible unit
      if (!newCompatibleUnits.includes(concentrationUnit)) {
        setConcentrationUnit(newCompatibleUnits[0]);
      }
    }
  }, [unit, setConcentrationUnit]);
  
  // Validate concentration unit compatibility with dose unit
  useEffect(() => {
    if (unit && concentrationUnit) {
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      setIsCompatible(compatibility.isCompatible);
      setUnitCompatible(compatibility.isCompatible);
      
      if (!compatibility.isCompatible) {
        setConcentrationHint(`Unit mismatch: ${unit} dose is not compatible with ${concentrationUnit} concentration. Select a matching unit.`);
      } else {
        setConcentrationHint(null);
      }
    }
  }, [concentrationUnit, unit, setConcentrationHint, setUnitCompatible]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 4: Enter Concentration</Text>
      <Text style={styles.label}>Concentration Amount:</Text>
      <TextInput
        style={styles.input}
        value={concentrationAmount}
        onChangeText={(text) => {
          setConcentrationAmount(text);
        }}
        keyboardType="numeric"
        placeholder="e.g., 10"
        placeholderTextColor="#9ca3af"
      />
      {concentrationHint && <Text style={[styles.helperHint, !isCompatible && styles.errorHint]}>{concentrationHint}</Text>}
      <Text style={styles.label}>Unit:</Text>
      <View style={styles.radioContainer}>
        {compatibleUnits.includes('mg/ml') && (
          <TouchableOpacity
            style={[styles.radioButton, concentrationUnit === 'mg/ml' && styles.radioButtonSelected]}
            onPress={() => setConcentrationUnit('mg/ml')}
          >
            <Text style={[styles.radioText, concentrationUnit === 'mg/ml' && styles.radioTextSelected]}>mg/ml</Text>
          </TouchableOpacity>
        )}
        {compatibleUnits.includes('mcg/ml') && (
          <TouchableOpacity
            style={[styles.radioButton, concentrationUnit === 'mcg/ml' && styles.radioButtonSelected]}
            onPress={() => setConcentrationUnit('mcg/ml')}
          >
            <Text style={[styles.radioText, concentrationUnit === 'mcg/ml' && styles.radioTextSelected]}>mcg/ml</Text>
          </TouchableOpacity>
        )}
        {compatibleUnits.includes('units/ml') && (
          <TouchableOpacity
            style={[styles.radioButton, concentrationUnit === 'units/ml' && styles.radioButtonSelected]}
            onPress={() => setConcentrationUnit('units/ml')}
          >
            <Text style={[styles.radioText, concentrationUnit === 'units/ml' && styles.radioTextSelected]}>units/ml</Text>
          </TouchableOpacity>
        )}
      </View>
      {unit && (
        <Text style={styles.helperText}>
          Enter the concentration value and select a unit compatible with {unit} dose.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  errorHint: { color: '#B45309', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 8, borderRadius: 4 },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, width: '100%' },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', flex: 1, marginHorizontal: 5 },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});