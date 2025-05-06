import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { insulinVolumes, standardVolumes, syringeOptions } from '../lib/utils';

type Props = {
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  setManualSyringe: (syringe: { type: 'Insulin' | 'Standard'; volume: string }) => void;
  setSyringeHint: (hint: string | null) => void;
  syringeHint: string | null;
};

export default function SyringeStep({ manualSyringe, setManualSyringe, setSyringeHint, syringeHint }: Props) {
  const availableVolumes = manualSyringe.type === 'Insulin' ? insulinVolumes : standardVolumes;
  const isValidSyringeOption = syringeOptions[manualSyringe.type]?.[manualSyringe.volume];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Syringe Details</Text>
      <Text style={styles.label}>Syringe Type:</Text>
      <View style={styles.presetContainer}>
        <TouchableOpacity
          style={[styles.optionButton, manualSyringe.type === 'Insulin' && styles.selectedOption]}
          onPress={() => {
            setManualSyringe({ type: 'Insulin', volume: insulinVolumes[2] });
            setSyringeHint(null);
          }}
        >
          <Text style={[styles.buttonText, manualSyringe.type === 'Insulin' && styles.selectedButtonText]}>Insulin (units)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.optionButton, manualSyringe.type === 'Standard' && styles.selectedOption]}
          onPress={() => {
            setManualSyringe({ type: 'Standard', volume: standardVolumes[1] });
            setSyringeHint(null);
          }}
        >
          <Text style={[styles.buttonText, manualSyringe.type === 'Standard' && styles.selectedButtonText]}>Standard (ml)</Text>
        </TouchableOpacity>
      </View>
      {syringeHint && <Text style={styles.helperHint}>{syringeHint}</Text>}
      <Text style={styles.label}>Syringe Volume:</Text>
      <View style={styles.presetContainer}>
        {availableVolumes.map((volume) => (
          <TouchableOpacity
            key={volume}
            style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]}
            onPress={() => setManualSyringe((prev) => ({ ...prev, volume }))}
          >
            <Text style={[styles.buttonText, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isValidSyringeOption ? (
        <Text style={styles.inferredMarkings}>
          Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {syringeOptions[manualSyringe.type][manualSyringe.volume]}
        </Text>
      ) : (
        <Text style={[styles.inferredMarkings, { color: '#991B1B', fontWeight: 'bold' }]}>Markings unavailable.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '100%' },
  optionButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', marginHorizontal: 5 },
  selectedOption: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  buttonText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  inferredMarkings: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});