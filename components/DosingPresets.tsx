import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  deleteDosingPreset,
  DosingPreset,
  getDosingPresets,
  MAX_DOSING_PRESETS,
  saveDosingPreset,
} from '../lib/dosingPresets';

type Props = {
  mode: 'apply' | 'save';
  preset?: Omit<DosingPreset, 'id' | 'name' | 'notes'>;
  onApply?: (preset: DosingPreset) => void;
};

const LIMIT_MESSAGE = `You can save up to ${MAX_DOSING_PRESETS} presets. Delete one from Presets to save another.`;

export default function DosingPresets({ mode, preset, onApply }: Props) {
  const [presets, setPresets] = useState<DosingPreset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getDosingPresets().then(
      saved => {
        if (!active) return;
        setPresets(saved);
        setLoaded(true);
      },
      () => {
        if (!active) return;
        setError('Could not load saved presets.');
        setLoaded(true);
      },
    );
    return () => { active = false; };
  }, []);

  const atLimit = presets.length >= MAX_DOSING_PRESETS;
  const canSave = !!preset && !!name.trim() && loaded && !busy && !atLimit;

  const save = async () => {
    if (!canSave || !preset) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveDosingPreset({
        ...preset,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        notes: notes.trim() || undefined,
      });
      if (!saved) {
        setError(LIMIT_MESSAGE);
        return;
      }
      setPresets(saved);
      setName('');
      setNotes('');
      setMessage('Preset saved on this device.');
    } catch {
      setError('Could not save the preset. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: DosingPreset) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setPresets(await deleteDosingPreset(item.id));
      setDeletingId(null);
    } catch {
      setError('Could not delete the preset. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'apply') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.toggle}
          onPress={() => {
            setExpanded(!expanded);
            setDeletingId(null);
          }}
          accessibilityRole="button"
          accessibilityLabel="Presets"
          accessibilityState={{ expanded }}
          disabled={busy}
        >
          <Text style={styles.toggleText}>Presets</Text>
          {expanded ? <ChevronUp size={18} color="#005CC5" /> : <ChevronDown size={18} color="#005CC5" />}
        </TouchableOpacity>
        {expanded && (
          <>
            {loaded && presets.length === 0 && !error && <Text style={styles.details}>No saved presets yet.</Text>}
            {presets.map(item => (
              <View key={item.id} style={styles.presetCard}>
                <TouchableOpacity
                  onPress={() => {
                    setExpanded(false);
                    setDeletingId(null);
                    onApply?.(item);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Apply ${item.name} preset`}
                  disabled={busy}
                >
                  <Text style={styles.presetName}>{item.name}</Text>
                  <Text style={styles.details}>{item.dose} {item.unit}{item.substanceName ? ` ${item.substanceName}` : ''}</Text>
                  {!!item.notes && <Text style={styles.details}>{item.notes}</Text>}
                </TouchableOpacity>
                {deletingId === item.id ? (
                  <View>
                    <Text style={styles.details}>Delete {item.name}?</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel deleting preset" disabled={busy} onPress={() => setDeletingId(null)}>
                        <Text style={styles.action}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Confirm delete ${item.name} preset`}
                        disabled={busy}
                        onPress={() => remove(item)}
                      >
                        <Text style={styles.deleteAction}>Delete preset</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name} preset`}
                    disabled={busy}
                    onPress={() => setDeletingId(item.id)}
                  >
                    <Text style={styles.deleteAction}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Save as a dosing preset</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Preset name" placeholderTextColor="#636366" accessibilityLabel="Preset name" />
      <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor="#636366" accessibilityLabel="Preset notes" multiline />
      <TouchableOpacity style={[styles.saveButton, !canSave && styles.disabled]} disabled={!canSave} onPress={save} accessibilityRole="button" accessibilityLabel="Save dosing preset">
        <Text style={styles.saveText}>Save preset</Text>
      </TouchableOpacity>
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>}
      {(atLimit || !!error) && <Text accessibilityRole="alert" style={styles.error}>{error || LIMIT_MESSAGE}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#F2F2F7', borderRadius: 8, padding: 12, marginBottom: 16 },
  heading: { color: '#000', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  toggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36 },
  toggleText: { color: '#005CC5', fontSize: 16, fontWeight: '600' },
  presetCard: { backgroundColor: '#FFF', borderColor: '#D1D1D6', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 },
  presetName: { color: '#000', fontWeight: '600' },
  details: { color: '#636366', fontSize: 14, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { color: '#005CC5', paddingVertical: 8 },
  deleteAction: { color: '#B42318', paddingVertical: 8 },
  input: { backgroundColor: '#FFF', color: '#000', borderColor: '#D1D1D6', borderWidth: 1, borderRadius: 6, padding: 10, fontSize: 16, marginBottom: 8 },
  saveButton: { backgroundColor: '#007AFF', borderRadius: 8, padding: 12, alignItems: 'center' },
  disabled: { backgroundColor: '#C7C7CC' },
  saveText: { color: '#FFF', fontWeight: '600' },
  message: { color: '#248A3D', marginTop: 8 },
  error: { color: '#B42318', marginTop: 8 },
});
