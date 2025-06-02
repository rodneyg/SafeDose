import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  substanceName: string;
  setSubstanceName: (name: string) => void;
  setSubstanceNameHint: (hint: string | null) => void;
  substanceNameHint: string | null;
  medicationInputType: 'concentration' | 'totalAmount' | null;
  setMedicationInputType: (type: 'concentration' | 'totalAmount' | null) => void;
  dose?: string;
  unit?: string;
};

export default function MedicationSourceStep({
  substanceName,
  setSubstanceName,
  setSubstanceNameHint,
  substanceNameHint,
  medicationInputType,
  setMedicationInputType,
  dose,
  unit
}: Props) {
  // Infer the best default medication input type based on the dose and unit
  useEffect(() => {
    if (medicationInputType === null) {
      // Default to 'totalAmount' unless inference logic suggests otherwise
      let inferred = 'totalAmount';
      
      // If we have dose and unit values, attempt to infer the best type
      if (dose && unit) {
        const doseValue = parseFloat(dose);
        
        // Only apply inference if we have a valid number
        if (!isNaN(doseValue)) {
          // For mcg, typically smaller values are concentrations, larger are total amounts
          if (unit === 'mcg' && doseValue < 100) {
            inferred = 'concentration';
          }
          // For mg, typically larger values indicate total amount
          else if (unit === 'mg' && doseValue > 5) {
            inferred = 'totalAmount';
          }
          // For units (like insulin), typically larger values are total amounts
          else if (unit === 'units' && doseValue > 10) {
            inferred = 'totalAmount';
          }
        }
      }
      
      console.log(`[MedicationSourceStep] Inferred medication type: ${inferred} based on dose=${dose}, unit=${unit}`);
      setMedicationInputType(inferred);
    }
  }, [medicationInputType, setMedicationInputType, dose, unit]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2: Medication Details</Text>
      <TextInput
        style={styles.input}
        placeholder="Substance Name (Optional)"
        placeholderTextColor="#9ca3af"
        value={substanceName}
        onChangeText={(text) => {
          setSubstanceName(text);
          setSubstanceNameHint(null);
        }}
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => {
          // Prevent any layout shifts when submit is pressed
        }}
      />
      {substanceNameHint && <Text style={styles.helperHint}>{substanceNameHint}</Text>}
      <Text style={styles.label}>Select how the medication amount is specified on the vial label:</Text>
      <View style={styles.radioContainer}>
        <TouchableOpacity
          style={[styles.radioButton, medicationInputType === 'concentration' && styles.radioButtonSelected]}
          onPress={() => setMedicationInputType('concentration')}
        >
          <Text style={[styles.radioText, medicationInputType === 'concentration' && styles.radioTextSelected]}>
            Concentration (e.g., 10 mg/ml, 100 mcg/ml, 100 units/ml)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, medicationInputType === 'totalAmount' && styles.radioButtonSelected]}
          onPress={() => setMedicationInputType('totalAmount')}
        >
          <Text style={[styles.radioText, medicationInputType === 'totalAmount' && styles.radioTextSelected]}>
            Total Amount in Vial (e.g., 50 mg, 500 mcg, 1000 units)
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 8, 
    width: '100%', 
    maxWidth: 600, 
    marginBottom: 20,
    overflow: 'hidden', // Prevent container content from overflowing
  },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  radioContainer: { flexDirection: 'column', alignItems: 'center', marginBottom: 10, width: '100%', gap: 10 },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', width: '100%' },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
});