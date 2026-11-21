import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  isProtocolDate, isProtocolDose, protocolCadences, protocolUnits, savePrescribedProtocol,
  type ProtocolCadence, type ProtocolDoseUnit,
} from '@/lib/prescribedProtocol';

const protocolTypes = [
  { value: 'trt', label: 'Testosterone replacement therapy (TRT)' },
  { value: 'peptides', label: 'Peptides' },
  { value: 'custom', label: 'Custom protocol' },
] as const;
const frequencyLabels = { 1: 'Daily', 7: 'Weekly', 14: 'Every two weeks' };

type ProtocolType = typeof protocolTypes[number]['value'];

export default function ProtocolSetup() {
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useLocalSearchParams<{ settings?: string }>();
  const fromSettings = settings === '1';
  const [step, setStep] = useState<'choice' | 'form' | 'saved'>(fromSettings ? 'form' : 'choice');
  const [type, setType] = useState<ProtocolType | null>(null);
  const [medication, setMedication] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState<ProtocolDoseUnit | null>(null);
  const [cadenceDays, setCadenceDays] = useState<ProtocolCadence | null>(null);
  const [firstDate, setFirstDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);

  const openFirstScan = () => {
    router.replace('/(tabs)/new-dose?startScan=true');
  };

  const openSchedule = () => {
    if (submitting.current) return;
    submitting.current = true;
    router.replace({ pathname: '/protocol-schedule', params: fromSettings ? {} : { onboarding: '1' } });
  };

  const skipProtocol = () => {
    if (submitting.current) return;
    submitting.current = true;
    if (fromSettings && step !== 'saved') router.replace('/protocol-schedule');
    else openFirstScan();
  };

  const saveProtocol = async () => {
    if (submitting.current) return;

    const doseText = dose.trim();
    if (!type || !medication.trim() || !unit || !cadenceDays) {
      setError('Choose a protocol, dose unit and frequency, and enter the medication.');
      return;
    }
    if (!isProtocolDose(doseText)) {
      setError('Enter a dose greater than zero using digits and a decimal point.');
      return;
    }
    if (!isProtocolDate(firstDate.trim())) {
      setError('Enter a valid first dose date in YYYY-MM-DD format.');
      return;
    }

    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await savePrescribedProtocol(user?.uid, {
        type, medication: medication.trim(), dose: doseText, unit, cadenceDays,
        firstDate: firstDate.trim(), savedAt: Date.now(),
      });
      setStep('saved');
    } catch {
      setError('Your protocol could not be saved. Try again or continue without it.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  if (step === 'saved') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Protocol saved</Text>
          <Text style={styles.description}>
            Your schedule uses the frequency and first date you entered.
          </Text>
          <TouchableOpacity accessibilityRole="button" onPress={openSchedule} style={styles.primary}>
            <Text style={styles.primaryText}>View my schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={skipProtocol} style={styles.choice}>
            <Text style={styles.choiceText}>Continue to first scan</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const showForm = step === 'form';
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>{fromSettings ? 'Set up your protocol' : 'Are you following a protocol?'}</Text>
        <Text style={styles.description}>
          {showForm
            ? 'Enter the details from your prescription. They’ll be saved on this device.'
            : 'You can save your prescribed protocol or go straight to your first scan.'}
        </Text>
        {showForm ? (
          <>
            <Text style={styles.label}>Protocol type</Text>
            {protocolTypes.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: type === value, disabled: saving }}
                disabled={saving}
                onPress={() => setType(value)}
                style={[styles.choice, type === value && styles.selected]}
              >
                <Text style={styles.choiceText}>{label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.label}>Medication name</Text>
            <TextInput accessibilityLabel="Medication name" value={medication} onChangeText={setMedication}
              editable={!saving} style={styles.input} />
            <Text style={styles.label}>Dose per administration</Text>
            <TextInput accessibilityLabel="Dose per administration" value={dose} onChangeText={setDose}
              editable={!saving} keyboardType="decimal-pad" style={styles.input} />
            <Text style={styles.label}>Dose unit</Text>
            <View style={styles.units}>
              {protocolUnits.map(value => (
                <TouchableOpacity
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: unit === value, disabled: saving }}
                  disabled={saving}
                  onPress={() => setUnit(value)}
                  style={[styles.choice, unit === value && styles.selected]}
                >
                  <Text style={styles.choiceText}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.units}>
              {protocolCadences.map(days => (
                <TouchableOpacity key={days} accessibilityRole="radio" disabled={saving}
                  accessibilityState={{ checked: cadenceDays === days, disabled: saving }}
                  onPress={() => setCadenceDays(days)} style={[styles.choice, cadenceDays === days && styles.selected]}>
                  <Text style={styles.choiceText}>{frequencyLabels[days]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>First dose date</Text>
            <TextInput accessibilityLabel="First dose date" value={firstDate} onChangeText={setFirstDate}
              editable={!saving} placeholder="YYYY-MM-DD" placeholderTextColor="#667085" style={styles.input} />
            {error !== '' && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }}
              disabled={saving} onPress={saveProtocol} style={[styles.primary, saving && styles.saving]}>
              <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save and continue'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity accessibilityRole="button" onPress={() => setStep('form')} style={styles.primary}>
            <Text style={styles.primaryText}>Yes, set up my protocol</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving }}
          disabled={saving} onPress={skipProtocol} style={styles.choice}>
          <Text style={styles.choiceText}>{fromSettings ? 'Cancel' : showForm ? 'Continue without saving' : 'No, continue to scan'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 24, gap: 10 },
  title: { color: '#111827', fontSize: 28, fontWeight: '700', marginTop: 16 },
  description: { color: '#475467', fontSize: 16, lineHeight: 23, marginBottom: 10 },
  label: { color: '#1f2937', fontSize: 15, fontWeight: '600', marginTop: 6 },
  input: {
    minHeight: 46, borderWidth: 1, borderColor: '#98a2b3', borderRadius: 9,
    paddingHorizontal: 12, color: '#111827', fontSize: 16,
  },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 44, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#98a2b3', borderRadius: 9, justifyContent: 'center',
  },
  selected: { backgroundColor: '#e8f1fe', borderColor: '#005ec4' },
  choiceText: { color: '#1f2937', fontSize: 15, fontWeight: '600' },
  primary: {
    backgroundColor: '#005ec4', minHeight: 46, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', padding: 12,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saving: { opacity: 0.65 },
  error: { color: '#9f2015', fontSize: 15 },
});
