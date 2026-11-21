import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProtocolSchedulePreview from '../components/ProtocolSchedulePreview';
import SyringeIllustration from '../components/SyringeIllustration';
import DatePickerSelect from '../components/ui/DatePickerSelect';
import { useAuth } from '../contexts/AuthContext';
import { calculationErrorMessage } from '../lib/calculationErrorMessage';
import { Exact } from '../lib/dosing/exact';
import { getSyringeMarkings, u40Markings, syringeOptions, SyringeSelection } from '../lib/dosing/syringes';
import {
  DoseTimeOffsets, parseProtocolStart, protocolFrequencies,
  ProtocolFrequency, ProtocolUnit, translateWeeklyDose,
} from '../lib/protocolPlan';

const syringeChoices = [
  ...Object.keys(syringeOptions.Standard).map(volume => ({ type: 'Standard', volume } as const)),
  ...Object.keys(syringeOptions.Insulin).map(volume => ({ type: 'Insulin', volume, insulinScale: 'U-100' } as const)),
  ...Object.keys(u40Markings).map(volume => ({ type: 'Insulin', volume, insulinScale: 'U-40' } as const)),
].map((syringe: SyringeSelection) => {
  const scale = syringe.insulinScale ?? 'standard';
  return { syringe, label: `${syringe.volume.replace(' ml', ' mL')} ${scale}`, value: `${scale}/${syringe.volume}` };
});

type Draft = {
  compound: string;
  unit: ProtocolUnit;
  concentration: string;
  weeklyTotal: string;
  frequency: ProtocolFrequency | null;
  date: string;
  time: string;
  syringeKey: string;
  offsets: DoseTimeOffsets;
};

const emptyDraft: Draft = {
  compound: '', unit: 'mg', concentration: '', weeklyTotal: '',
  frequency: null, date: '', time: '', syringeKey: '', offsets: {},
};

function readDraft(raw: string): Draft {
  const saved = JSON.parse(raw);
  const textFields = ['compound', 'concentration', 'weeklyTotal', 'date', 'time'];
  if (!saved || textFields.some(field => typeof saved[field] !== 'string') ||
      !['mg', 'IU'].includes(saved.unit) ||
      !protocolFrequencies.some(({ count }) => count === saved.frequency) ||
      !syringeChoices.some(({ value }) => value === saved.syringeKey) ||
      !saved.offsets || typeof saved.offsets !== 'object' || Array.isArray(saved.offsets) ||
      Object.entries(saved.offsets).some(([index, minutes]) =>
        !/^\d+$/.test(index) || !Number.isSafeInteger(Number(index)) || Number(index) < 1 ||
        typeof minutes !== 'number' || !Number.isInteger(minutes) || Math.abs(minutes) > 7 * 24 * 60)) {
    throw new Error('Invalid saved protocol');
  }
  return saved;
}

function formatExact(value: Exact) {
  const exact = value.toString();
  if (!exact.includes('/') && exact.length <= 15) return exact;
  const displayed = Number(value.toNumber().toPrecision(8));
  return new Exact(displayed).compare(value) === 0 ? String(displayed) : `≈ ${displayed}`;
}

function ProtocolInput({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor="#64748B" style={styles.input} {...props} />
    </View>
  );
}

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={[styles.choice, selected && styles.selectedChoice]}>
      <Text style={[styles.choiceText, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

export default function ProtocolRoute() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { user } = useAuth();
  const owner = user ? `user:${user.uid}` : 'guest';
  return <ProtocolScreen key={owner} storageKey={`dosingProtocol:v1:${owner}`} onboarding={onboarding === '1'} />;
}

function ProtocolScreen({ onboarding, storageKey }: { onboarding: boolean; storageKey: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);
  const active = useRef(false);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    AsyncStorage.getItem(storageKey).then(raw => {
      if (!cancelled) setDraft(raw ? readDraft(raw) : emptyDraft);
    }).catch(() => {
      if (!cancelled) setError('The saved protocol could not be loaded. Go back and try again.');
    });
    return () => { cancelled = true; active.current = false; };
  }, [storageKey]);

  const finish = () => router.replace(onboarding ? '/(tabs)/new-dose?startScan=true' : '/(tabs)/settings');
  const update = (patch: Partial<Draft>) => {
    setError('');
    setDraft(current => current && { ...current, ...patch });
  };

  const start = draft ? parseProtocolStart(draft.date, draft.time) : null;
  const syringeChoice = syringeChoices.find(({ value }) => value === draft?.syringeKey);
  const result = draft?.frequency && draft.weeklyTotal && draft.concentration && syringeChoice
    ? translateWeeklyDose(draft.weeklyTotal, draft.concentration, draft.unit, draft.frequency, syringeChoice.syringe)
    : null;
  const marking = result?.recommendedMarking ? new Exact(result.recommendedMarking) : null;

  async function save() {
    if (!draft || saving.current) return;
    if (!draft.compound.trim() || !draft.concentration || !draft.weeklyTotal || !draft.frequency || !syringeChoice) {
      setError('Enter the compound, concentration, weekly total, frequency, and syringe.');
      return;
    }
    if (!start) {
      setError('Enter a valid first date and time using YYYY-MM-DD and 24-hour HH:MM.');
      return;
    }
    if (!marking) {
      setError(calculationErrorMessage(result?.calculationError ?? 'Check your dose and syringe details.'));
      return;
    }
    saving.current = true;
    setIsSaving(true);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify({ ...draft, compound: draft.compound.trim() }));
      if (active.current) finish();
    } catch {
      if (active.current) setError('The protocol could not be saved. Try again.');
    } finally {
      saving.current = false;
      if (active.current) setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Dosing protocol
            </Text>
            <Text style={styles.description}>Enter your prescribed weekly total and frequency to preview each dose and its timing.</Text>
          </View>
          {draft && (
            <View style={styles.columns}>
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.heading}>Protocol details</Text>
                <ProtocolInput label="Compound name" value={draft.compound} maxLength={100}
                  onChangeText={compound => update({ compound })} />
                <View style={styles.field}>
                  <Text style={styles.label}>Medication unit</Text>
                  <View style={styles.row}>
                    {(['mg', 'IU'] as const).map(unit => (
                      <ChoiceButton key={unit} label={unit} selected={draft.unit === unit}
                        onPress={() => { if (draft.unit !== unit) update({ unit, concentration: '', weeklyTotal: '' }); }} />
                    ))}
                  </View>
                </View>
                <View style={styles.row}>
                  <ProtocolInput label={`Concentration (${draft.unit}/mL)`} value={draft.concentration}
                    inputMode="decimal" maxLength={24} onChangeText={concentration => update({ concentration })} />
                  <ProtocolInput label={`Weekly total (${draft.unit})`} value={draft.weeklyTotal}
                    inputMode="decimal" maxLength={24} onChangeText={weeklyTotal => update({ weeklyTotal })} />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>Frequency</Text>
                  <View style={styles.row}>
                    {protocolFrequencies.map(({ count, label }) => (
                      <ChoiceButton key={count} label={label} selected={draft.frequency === count}
                        onPress={() => { if (draft.frequency !== count) update({ frequency: count, offsets: {} }); }} />
                    ))}
                  </View>
                </View>
                <View style={styles.row}>
                  <ProtocolInput label="First dose date" placeholder="YYYY-MM-DD" maxLength={10}
                    value={draft.date} onChangeText={date => update({ date, offsets: {} })} />
                  <ProtocolInput label="First dose time (24-hour)" placeholder="HH:MM" maxLength={5}
                    value={draft.time} onChangeText={time => update({ time, offsets: {} })} />
                </View>
                <DatePickerSelect label="Syringe label" placeholder="Choose the syringe specified for your medication"
                  value={draft.syringeKey} items={syringeChoices} onValueChange={syringeKey => update({ syringeKey: syringeKey || '' })} />
              </View>
              <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.heading}>Per-dose preview</Text>
                {result?.amount && result.volume && marking && syringeChoice ? (
                  <View style={styles.result}>
                    <Text style={styles.amount}>{formatExact(result.amount)} {draft.unit} · {formatExact(result.volume)} mL</Text>
                    <Text style={styles.description}>
                      Calculated mark on a {syringeChoice.label} syringe: {formatExact(marking)} {syringeChoice.syringe.type === 'Insulin' ? 'syringe units' : 'mL'}
                    </Text>
                    <View style={styles.illustration}>
                      <SyringeIllustration syringeType={syringeChoice.syringe.type} syringeVolume={syringeChoice.syringe.volume}
                        recommendedMarking={result.recommendedMarking} showDrawLabel={false}
                        width={Math.min(300, width - 92)}
                        syringeOptions={{ [syringeChoice.syringe.type]: {
                          [syringeChoice.syringe.volume]: getSyringeMarkings(syringeChoice.syringe) || '',
                        } }} />
                    </View>
                    <Text style={styles.description}>Confirm the dose, timing and measurable syringe mark with your prescription.</Text>
                  </View>
                ) : (
                  <Text style={result?.calculationError ? styles.error : styles.description}>
                    {result?.calculationError ? calculationErrorMessage(result.calculationError) :
                      'Enter the concentration, weekly total, frequency, and syringe to see the conversion.'}
                  </Text>
                )}
                {start && draft.frequency && (
                  <ProtocolSchedulePreview key={`${start.getTime()}:${draft.frequency}`} start={start}
                    frequency={draft.frequency} offsets={draft.offsets} onChange={offsets => update({ offsets })} />
                )}
              </View>
            </View>
          )}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {!!draft && <Text style={styles.description}>Save this schedule on your device and edit it anytime in Settings.</Text>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={isSaving} onPress={finish} style={styles.secondary}>
              <Text style={styles.secondaryText}>{onboarding ? 'Skip to first scan' : 'Back to Settings'}</Text>
            </Pressable>
            {draft && (
              <Pressable accessibilityRole="button" disabled={isSaving} onPress={save} style={styles.primary}>
                <Text style={styles.primaryText}>{isSaving ? 'Saving…' : onboarding ? 'Save schedule and continue to scan' : 'Save protocol'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F2F5FA' },
  scroll: { paddingHorizontal: 12, paddingVertical: 24 },
  content: { width: '100%', maxWidth: 1010, alignSelf: 'center', gap: 16 },
  header: { paddingHorizontal: 4, gap: 6 },
  title: { color: '#111827', fontSize: 30, fontWeight: '700' },
  heading: { color: '#111827', fontSize: 19, fontWeight: '700' },
  description: { color: '#475569', fontSize: 14, lineHeight: 20 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  card: { flexGrow: 1, flexBasis: 370, maxWidth: '100%', padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 13 },
  field: { flex: 1, minWidth: 120, gap: 5 },
  label: { color: '#1E293B', fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#94A3B8', borderRadius: 8, padding: 10, color: '#111827', fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' },
  choice: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10 },
  selectedChoice: { borderColor: '#1257B8', backgroundColor: '#E8F2FF' },
  choiceText: { color: '#334155', fontSize: 14 },
  selectedText: { color: '#134A92', fontWeight: '700' },
  result: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, gap: 5 },
  amount: { color: '#123F79', fontSize: 24, fontWeight: '700' },
  illustration: { alignSelf: 'center', height: 80 },
  error: { color: '#991B1B', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  secondary: { padding: 12 },
  secondaryText: { color: '#1257B8', fontWeight: '600' },
  primary: { backgroundColor: '#1257B8', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
});
