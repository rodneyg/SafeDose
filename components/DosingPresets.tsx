import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DosingPreset, getDosingPresets, saveDosingPreset } from '../lib/dosingPresets';

type Props = {
  mode: 'apply' | 'save';
  preset?: Omit<DosingPreset, 'id' | 'name'>;
  onApply?: (preset: DosingPreset) => void;
};

export default function DosingPresets({ mode, preset, onApply }: Props) {
  const [presets, setPresets] = useState<DosingPreset[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => setPresets(await getDosingPresets()), []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName || !preset) return;
    const saved = await saveDosingPreset({ ...preset, id: `${Date.now()}`, name: trimmedName });
    setPresets(saved);
    setName('');
    setMessage('Preset saved on this device.');
  };

  if (mode === 'apply') {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Dosing presets</Text>
        {presets.length === 0 ? (
          <Text style={styles.empty}>No saved presets yet.</Text>
        ) : presets.map(item => (
          <TouchableOpacity key={item.id} style={styles.presetButton} onPress={() => onApply?.(item)} accessibilityRole="button" accessibilityLabel={`Apply ${item.name} preset`}>
            <Text style={styles.presetName}>{item.name}</Text>
            <Text style={styles.details}>{item.dose} {item.unit}{item.substanceName ? ` ${item.substanceName}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Save as a dosing preset</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Preset name" placeholderTextColor="#8E8E93" accessibilityLabel="Preset name" />
      <TouchableOpacity style={[styles.saveButton, !name.trim() && styles.disabled]} disabled={!name.trim()} onPress={save} accessibilityRole="button" accessibilityLabel="Save dosing preset">
        <Text style={styles.saveText}>Save preset</Text>
      </TouchableOpacity>
      {!!message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#F2F2F7', borderRadius: 8, padding: 12, marginBottom: 16 },
  heading: { color: '#000', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  empty: { color: '#636366', fontSize: 14 },
  presetButton: { backgroundColor: '#FFF', borderColor: '#D1D1D6', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 },
  presetName: { color: '#000', fontWeight: '600' },
  details: { color: '#636366', marginTop: 2 },
  input: { backgroundColor: '#FFF', color: '#000', borderColor: '#D1D1D6', borderWidth: 1, borderRadius: 6, padding: 10, fontSize: 16 },
  saveButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 8 },
  disabled: { backgroundColor: '#C7C7CC' },
  saveText: { color: '#FFF', fontWeight: '600' },
  message: { color: '#248A3D', marginTop: 8 },
});
