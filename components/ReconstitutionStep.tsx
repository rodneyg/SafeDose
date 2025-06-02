import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';

type Props = {
  solutionVolume: string;
  setSolutionVolume: (volume: string) => void;
};

export default function ReconstitutionStep({ solutionVolume, setSolutionVolume }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 2c: Solution Volume</Text>
      <Text style={styles.labelBold}>How much liquid (ml) does the medication contain?</Text>
      <Text style={styles.label}>(e.g., total solution volume in the vial)</Text>
      <View style={styles.presetContainer}>
        {['1', '2', '3', '5'].map((ml) => (
          <TouchableOpacity
            key={ml + 'ml'}
            style={[styles.optionButton, solutionVolume === ml && styles.selectedOption]}
            onPress={() => setSolutionVolume(ml)}
          >
            <Text style={[styles.buttonText, solutionVolume === ml && styles.selectedButtonText]}>{ml} ml</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[styles.input, { marginTop: 10 }]}
        placeholder="Or enter custom volume (ml)"
        placeholderTextColor="#9ca3af"
        value={solutionVolume}
        onChangeText={setSolutionVolume}
        keyboardType="numeric"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => {
          // Dismiss keyboard and prevent any layout shifts when submit is pressed
          Keyboard.dismiss();
        }}
      />
      <Text style={styles.helperText}>
        This volume is needed to calculate the concentration of the medication.
      </Text>
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
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6, textAlign: 'center' },
  labelBold: { fontSize: 15, fontWeight: '600', color: '#000000', marginTop: 12, marginBottom: 8, textAlign: 'center' },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '100%' },
  optionButton: { backgroundColor: '#E5E5EA', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, minWidth: 60, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  selectedOption: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  buttonText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});