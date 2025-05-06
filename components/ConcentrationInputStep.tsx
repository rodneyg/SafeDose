import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  concentrationAmount: string;
  setConcentrationAmount: (amount: string) => void;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  setConcentrationUnit: (unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  setConcentrationHint: (hint: string | null) => void;
  concentrationHint: string | null;
};

export default function ConcentrationInputStep({
  concentrationAmount,
  setConcentrationAmount,
  concentrationUnit,
  setConcentrationUnit,
  setConcentrationHint,
  concentrationHint,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2a: Enter Concentration</Text>
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
        <TouchableOpacity
          style={[styles.radioButton, concentrationUnit === 'mg/ml' && styles.radioButtonSelected]}
          onPress={() => setConcentrationUnit('mg/ml')}
        >
          <Text style={[styles.radioText, concentrationUnit === 'mg/ml' && styles.radioTextSelected]}>mg/ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, concentrationUnit === 'mcg/ml' && styles.radioButtonSelected]}
          onPress={() => setConcentrationUnit('mcg/ml')}
        >
          <Text style={[styles.radioText, concentrationUnit === 'mcg/ml' && styles.radioTextSelected]}>mcg/ml</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, concentrationUnit === 'units/ml' && styles.radioButtonSelected]}
          onPress={() => setConcentrationUnit('units/ml')}
        >
          <Text style={[styles.radioText, concentrationUnit === 'units/ml' && styles.radioTextSelected]}>units/ml</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.helperText}>Enter the concentration value and select the unit.</Text>
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
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});