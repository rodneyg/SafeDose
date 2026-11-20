import { useRef, useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingDetails } from '@/contexts/OnboardingContext';
import { calculateDose } from '@/lib/dosing/calculateDose';
import { formatDoseNumber } from '@/lib/dosing/display';
import { parseInputNumber } from '@/lib/dosing/inputs';
import { standardVolumes } from '@/lib/dosing/syringes';
import { firstDoseQuickStartEnabled } from '@/lib/firstDoseExperiment';
import { calculationErrorMessage } from '@/lib/calculationErrorMessage';
import { useDoseLogging } from '@/lib/hooks/useDoseLogging';

export default function QuickStartRoute() {
  const { details } = useOnboardingDetails();
  if (!firstDoseQuickStartEnabled) return <Redirect href="/onboarding" />;
  if (details.age !== null && details.age < 18) return <Redirect href="/onboarding/child-safety" />;
  if (details.age === null && !details.limitedFunctionality) return <Redirect href="/onboarding/age" />;
  return <QuickStart />;
}

function QuickStart() {
  const router = useRouter();
  const { logDose, isLogging } = useDoseLogging();
  const [medication, setMedication] = useState('');
  const [dose, setDose] = useState('');
  const [strength, setStrength] = useState('');
  const [syringeVolume, setSyringeVolume] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const saveInFlight = useRef(false);

  const doseValue = parseInputNumber(dose);
  const concentration = parseInputNumber(strength);
  const result = dose && strength && syringeVolume
    ? calculateDose({
      doseValue,
      concentration,
      unit: 'mg',
      concentrationUnit: 'mg/ml',
      manualSyringe: { type: 'Standard', volume: syringeVolume },
    })
    : null;

  const canSave = Boolean(medication.trim() && result?.calculatedVolume && !result.calculationError);

  async function save() {
    if (saveInFlight.current || saved || !canSave || !result?.calculatedVolume) return;
    saveInFlight.current = true;
    setSaveError('');
    try {
      const logged = await logDose({
        substanceName: medication.trim(),
        doseValue,
        unit: 'mg',
        calculatedVolume: result.calculatedVolume,
        syringeType: 'Standard',
        recommendedMarking: result.recommendedMarking,
        medicationInputType: 'concentration',
        concentrationAmount: strength.trim(),
        concentrationUnit: 'mg/ml',
      });
      if (logged.success) setSaved(true);
      else setSaveError(logged.limitReached ? 'You have reached your dose logging limit.' : 'Could not save the dose. Try again.');
    } finally {
      saveInFlight.current = false;
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text accessibilityRole="header" style={styles.title}>Quick start</Text>
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={styles.body}>Dose logged.</Text>
        ) : (
          <>
            <Text style={styles.body}>Log a dose you already took. This form uses mg, mg/mL and a standard syringe.</Text>
            <Text style={styles.label}>Medication name</Text>
            <TextInput accessibilityLabel="Medication name" style={styles.input} value={medication} onChangeText={setMedication} editable={!isLogging} />
            <Text style={styles.label}>Dose taken (mg)</Text>
            <TextInput accessibilityLabel="Dose taken (mg)" style={styles.input} value={dose} onChangeText={setDose} keyboardType="decimal-pad" editable={!isLogging} />
            <Text style={styles.label}>Strength on label (mg/mL)</Text>
            <TextInput accessibilityLabel="Strength on label (mg/mL)" style={styles.input} value={strength} onChangeText={setStrength} keyboardType="decimal-pad" editable={!isLogging} />
            <Text style={styles.label}>Standard syringe size</Text>
            <View style={styles.options}>
              {standardVolumes.map(volume => (
                <Pressable
                  key={volume}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: syringeVolume === volume }}
                  onPress={() => setSyringeVolume(volume)}
                  disabled={isLogging}
                  style={[styles.option, syringeVolume === volume && styles.optionSelected]}
                >
                  <Text style={styles.optionText}>{volume}</Text>
                </Pressable>
              ))}
            </View>
            {result?.calculationError && (
              <Text accessibilityRole="alert" style={styles.error}>{calculationErrorMessage(result.calculationError)}</Text>
            )}
            {!!result?.calculatedVolume && (
              <Text accessibilityLiveRegion="polite" style={styles.body}>Calculated volume to log is {formatDoseNumber(result.calculatedVolume, 3)} mL.</Text>
            )}
            {!!saveError && <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text>}
            <Pressable
              accessibilityRole="button"
              onPress={save}
              disabled={isLogging || !canSave}
              style={({ pressed }) => [styles.primary, (pressed || isLogging || !canSave) && styles.muted]}
            >
              <Text style={styles.primaryText}>{isLogging ? 'Logging…' : 'Log dose'}</Text>
            </Pressable>
          </>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.replace('/onboarding/demo')} disabled={isLogging} style={styles.secondary}>
          <Text style={styles.optionText}>{saved ? 'Continue setup' : 'Use the full setup'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#F5F7FA', paddingHorizontal: 20, paddingVertical: 32 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#172B43' },
  body: { fontSize: 16, lineHeight: 23, color: '#33475B' },
  label: { fontSize: 15, fontWeight: '600', color: '#172B43' },
  input: { minHeight: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#8999AB', borderRadius: 8, fontSize: 16, color: '#172B43' },
  options: { flexDirection: 'row', gap: 8 },
  option: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: '#8999AB', borderRadius: 8 },
  optionSelected: { backgroundColor: '#DBEAFE', borderColor: '#1454AD' },
  optionText: { color: '#1454AD', fontSize: 15, fontWeight: '600' },
  error: { color: '#9B2020', fontSize: 15 },
  primary: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4, borderRadius: 8, backgroundColor: '#1454AD' },
  muted: { opacity: 0.6 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  secondary: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
});
