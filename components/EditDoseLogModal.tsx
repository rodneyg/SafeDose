import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { INJECTION_SITES } from '../lib/injectionSites';
import { DoseLog, DoseLogEdit, InjectionSite } from '../types/doseLog';

const pad = (n: number) => String(n).padStart(2, '0');

/** Turns the date and time fields into an ISO timestamp, or null if they are not valid. */
export function parseLogDateTime(date: string, time: string): string | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!d || !t) return null;
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number);
  const value = new Date(y, mo - 1, da, h, mi);
  if (value.getFullYear() !== y || value.getMonth() !== mo - 1 || value.getDate() !== da ||
      value.getHours() !== h || value.getMinutes() !== mi) return null;
  return value.toISOString();
}

type Props = {
  log: DoseLog | null;
  onCancel: () => void;
  onSave: (logId: string, edit: DoseLogEdit) => Promise<void>;
};

export default function EditDoseLogModal({ log, onCancel, onSave }: Props) {
  const [dose, setDose] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [site, setSite] = useState<InjectionSite | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!log) return;
    const when = new Date(log.timestamp);
    const valid = !Number.isNaN(when.getTime());
    setDose(String(log.doseValue));
    setDate(valid ? `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}` : '');
    setTime(valid ? `${pad(when.getHours())}:${pad(when.getMinutes())}` : '');
    setSite(log.injectionSite ?? null);
    setNotes(log.notes ?? '');
    setError('');
    setSaving(false);
  }, [log]);

  if (!log) return null;

  async function save() {
    if (!log || saving) return;
    const doseValue = Number(dose);
    if (!dose.trim() || !Number.isFinite(doseValue) || doseValue <= 0) {
      setError('Enter a dose greater than zero.');
      return;
    }
    const timestamp = parseLogDateTime(date, time);
    if (!timestamp) {
      setError('Enter the date as YYYY-MM-DD and the time as HH:MM (24-hour).');
      return;
    }
    setSaving(true);
    try {
      await onSave(log.id, { doseValue, timestamp, injectionSite: site, notes });
    } catch {
      setError('The dose log could not be saved. Try again.');
      setSaving(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.title}>Edit dose log</Text>
            <Text style={styles.hint}>
              Changing the dose keeps the same concentration and updates the volume. Check the syringe marking before your next dose.
            </Text>
            <Text style={styles.label}>Dose ({log.unit})</Text>
            <TextInput accessibilityLabel={`Dose (${log.unit})`} style={styles.input} value={dose}
              inputMode="decimal" maxLength={24} onChangeText={v => { setError(''); setDose(v); }} />
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.label}>Date</Text>
                <TextInput accessibilityLabel="Date" style={styles.input} value={date} placeholder="YYYY-MM-DD"
                  maxLength={10} onChangeText={v => { setError(''); setDate(v); }} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.label}>Time (24-hour)</Text>
                <TextInput accessibilityLabel="Time" style={styles.input} value={time} placeholder="HH:MM"
                  maxLength={5} onChangeText={v => { setError(''); setTime(v); }} />
              </View>
            </View>
            <Text style={styles.label}>Injection site</Text>
            <View style={styles.chips}>
              {INJECTION_SITES.map(({ id, label }) => (
                <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: site === id }}
                  onPress={() => setSite(site === id ? null : id)}
                  style={[styles.chip, site === id && styles.chipOn]}>
                  <Text style={[styles.chipText, site === id && styles.chipTextOn]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>Notes</Text>
            <TextInput accessibilityLabel="Notes" style={[styles.input, styles.notes]} value={notes} multiline
              maxLength={500} onChangeText={setNotes} />
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <View style={styles.row}>
              <Pressable accessibilityRole="button" style={[styles.button, styles.cancel]} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={saving} style={[styles.button, styles.save]} onPress={save}>
                <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '90%' },
  title: { fontSize: 22, fontWeight: '700', color: '#000', marginBottom: 8 },
  hint: { fontSize: 14, color: '#6B6B6B', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#3C3C43', marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#C7C7CC', borderRadius: 8, padding: 10, fontSize: 16, color: '#000' },
  notes: { minHeight: 70, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, marginTop: 4 },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#C7C7CC', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: '#005DBF', borderColor: '#005DBF' },
  chipText: { fontSize: 14, color: '#000' },
  chipTextOn: { color: '#fff' },
  error: { color: '#BA1A1A', marginTop: 12, fontSize: 14 },
  button: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 16 },
  cancel: { backgroundColor: '#F2F2F7' },
  cancelText: { color: '#000', fontWeight: '600' },
  save: { backgroundColor: '#005DBF' },
  saveText: { color: '#fff', fontWeight: '700' },
});
