import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

type Props = {
  dose: string;
  setDose: (dose: string) => void;
  unit: 'mg' | 'mcg' | 'units';
  setUnit: (unit: 'mg' | 'mcg' | 'units') => void;
};

export default function DoseInputStep({ dose, setDose, unit, setUnit }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 1: Prescribed Dose</Text>
      <Text style={styles.label}>Dose Amount:</Text>
      <TextInput
        style={styles.input}
        value={dose}
        onChangeText={setDose}
        keyboardType="numeric"
        placeholder="e.g., 100"
        placeholderTextColor="#9ca3af"
      />
      <Text style={styles.label}>Unit:</Text>
      <View style={styles.radioContainer}>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mg' && styles.radioButtonSelected]}
          onPress={() => setUnit('mg')}
        >
          <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mcg' && styles.radioButtonSelected]}
          onPress={() => setUnit('mcg')}
        >
          <Text style={[styles.radioText, unit === 'mcg' && styles.radioTextSelected]}>mcg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'units' && styles.radioButtonSelected]}
          onPress={() => setUnit('units')}
        >
          <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, width: '100%' },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', flex: 1, marginHorizontal: 5 },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
});