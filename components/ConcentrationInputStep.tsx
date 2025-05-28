import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getCompatibleConcentrationUnits } from '../lib/doseUtils';

type Props = {
  concentrationAmount: string;
  setConcentrationAmount: (amount: string) => void;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  setConcentrationHint: (hint: string | null) => void;
  concentrationHint: string | null;
  doseUnit: 'mg' | 'mcg' | 'units' | 'mL';  // Added doseUnit prop to check compatibility
  formError: string | null;  // Added formError to display validation errors
};

export default function ConcentrationInputStep({
  concentrationAmount,
  setConcentrationAmount,
  concentrationUnit,
  setConcentrationUnit,
  setConcentrationHint,
  concentrationHint,
  doseUnit,
  formError,
}: Props) {
  // Get compatible concentration units based on dose unit
  const compatibleUnits = getCompatibleConcentrationUnits(doseUnit);

  // Auto-select a compatible concentration unit if current one is not compatible
  useEffect(() => {
    if (!compatibleUnits.includes(concentrationUnit) && compatibleUnits.length > 0) {
      // Select the first compatible unit
      setConcentrationUnit(compatibleUnits[0]);
      setConcentrationHint(`Unit automatically changed to match dose unit (${doseUnit})`);
    }
  }, [doseUnit, concentrationUnit, compatibleUnits, setConcentrationUnit, setConcentrationHint]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 4: Enter Concentration</Text>
      <Text style={styles.label}>Concentration Amount:</Text>
      <TextInput
        style={styles.input}
        value={concentrationAmount}
        onChangeText={(text) => {
          setConcentrationAmount(text);
          setConcentrationHint(null);
        }}
        keyboardType="numeric"
        placeholder="e.g., 10"
        placeholderTextColor="#9ca3af"
      />
      {concentrationHint && <Text style={styles.helperHint}>{concentrationHint}</Text>}
      <Text style={styles.label}>Unit:</Text>
      <View style={styles.radioContainer}>
        {['mg/ml', 'mcg/ml', 'units/ml'].map((unit) => (
          <TouchableOpacity
            key={unit}
            style={[
              styles.radioButton, 
              concentrationUnit === unit && styles.radioButtonSelected,
              !compatibleUnits.includes(unit as any) && styles.radioButtonDisabled
            ]}
            onPress={() => compatibleUnits.includes(unit as any) && setConcentrationUnit(unit as any)}
            disabled={!compatibleUnits.includes(unit as any)}
          >
            <Text 
              style={[
                styles.radioText, 
                concentrationUnit === unit && styles.radioTextSelected,
                !compatibleUnits.includes(unit as any) && styles.radioTextDisabled
              ]}
            >
              {unit}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {formError && <Text style={styles.errorText}>{formError}</Text>}
      <Text style={styles.helperText}>
        Enter the concentration value and select a compatible unit.
        {doseUnit && ` For ${doseUnit} dose, use ${compatibleUnits.join(' or ')}.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, width: '100%' },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', flex: 1, marginHorizontal: 5 },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioButtonDisabled: { backgroundColor: '#F2F2F7', borderColor: '#E5E5E5', opacity: 0.5 },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  radioTextDisabled: { color: '#8E8E93' },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10, marginBottom: 10 },
});