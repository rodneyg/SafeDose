import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native';
import { ArrowRight, Calendar, Clock, Pill } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { isMobileWeb } from '../../lib/utils';
import { FrequencyType, ConcentrationUnit } from '../../types/protocol';
import { useProtocolStorage } from '../../lib/hooks/useProtocolStorage';
import DatePickerSelect from '../ui/DatePickerSelect';

interface ProtocolSetupScreenProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function ProtocolSetupScreen({ onComplete, onSkip }: ProtocolSetupScreenProps) {
  const router = useRouter();
  const { createProtocol, isLoading } = useProtocolStorage();

  // Form state
  const [compoundName, setCompoundName] = useState('');
  const [concentration, setConcentration] = useState('');
  const [concentrationUnit, setConcentrationUnit] = useState<ConcentrationUnit>('mg/mL');
  const [weeklyTargetDose, setWeeklyTargetDose] = useState('');
  const [weeklyTargetUnit, setWeeklyTargetUnit] = useState('mg');
  const [frequency, setFrequency] = useState<FrequencyType>('2x-week');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');

  // Validation
  const isFormValid = compoundName.trim() !== '' && 
                     concentration.trim() !== '' && 
                     weeklyTargetDose.trim() !== '' &&
                     parseFloat(concentration) > 0 &&
                     parseFloat(weeklyTargetDose) > 0;

  const handleCreateProtocol = useCallback(async () => {
    if (!isFormValid) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields with valid values.');
      return;
    }

    try {
      await createProtocol({
        compoundName: compoundName.trim(),
        concentration: parseFloat(concentration),
        concentrationUnit,
        weeklyTargetDose: parseFloat(weeklyTargetDose),
        weeklyTargetUnit,
        frequency,
        startDate,
        startTime
      });

      Alert.alert(
        'Protocol Created!', 
        `Your ${compoundName} dosing protocol has been set up successfully.`,
        [{ text: 'OK', onPress: onComplete }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create protocol. Please try again.');
    }
  }, [
    isFormValid,
    createProtocol,
    compoundName,
    concentration,
    concentrationUnit,
    weeklyTargetDose,
    weeklyTargetUnit,
    frequency,
    startDate,
    startTime,
    onComplete
  ]);

  const frequencyOptions = [
    { label: 'Once weekly', value: '1x-week' },
    { label: 'Twice weekly', value: '2x-week' },
    { label: 'Three times weekly', value: '3x-week' },
    { label: 'Daily', value: 'daily' }
  ];

  const concentrationUnitOptions = [
    { label: 'mg/mL', value: 'mg/mL' },
    { label: 'IU/mL', value: 'IU/mL' },
    { label: 'mcg/mL', value: 'mcg/mL' },
    { label: 'units/mL', value: 'units/mL' }
  ];

  const doseUnitOptions = [
    { label: 'mg', value: 'mg' },
    { label: 'IU', value: 'IU' },
    { label: 'mcg', value: 'mcg' },
    { label: 'units', value: 'units' }
  ];

  // Generate time options (every 30 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute of [0, 30]) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      timeOptions.push({ label: displayTime, value: timeString });
    }
  }

  return (
    <SafeAreaView style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(200)} style={styles.header}>
          <Pill size={isMobileWeb ? 28 : 32} color="#007AFF" />
          <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>
            Set Up Dosing Protocol
          </Text>
          <Text style={[styles.subtitle, isMobileWeb && styles.subtitleMobile]}>
            Configure your medication schedule for intelligent dose reminders
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.form}>
          {/* Compound Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isMobileWeb && styles.labelMobile]}>
              Compound Name *
            </Text>
            <TextInput
              style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
              value={compoundName}
              onChangeText={setCompoundName}
              placeholder="e.g., Testosterone Cypionate, HCG, etc."
              placeholderTextColor="#8E8E93"
            />
          </View>

          {/* Concentration */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isMobileWeb && styles.labelMobile]}>
              Concentration *
            </Text>
            <View style={styles.concentrationRow}>
              <TextInput
                style={[styles.concentrationInput, isMobileWeb && styles.textInputMobile]}
                value={concentration}
                onChangeText={setConcentration}
                placeholder="300"
                placeholderTextColor="#8E8E93"
                keyboardType="decimal-pad"
              />
              <DatePickerSelect
                label=""
                value={concentrationUnit}
                onValueChange={(value) => setConcentrationUnit(value as ConcentrationUnit)}
                items={concentrationUnitOptions}
                placeholder="Unit"
              />
            </View>
          </View>

          {/* Weekly Target Dose */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isMobileWeb && styles.labelMobile]}>
              Weekly Target Dose *
            </Text>
            <View style={styles.concentrationRow}>
              <TextInput
                style={[styles.concentrationInput, isMobileWeb && styles.textInputMobile]}
                value={weeklyTargetDose}
                onChangeText={setWeeklyTargetDose}
                placeholder="150"
                placeholderTextColor="#8E8E93"
                keyboardType="decimal-pad"
              />
              <DatePickerSelect
                label=""
                value={weeklyTargetUnit}
                onValueChange={setWeeklyTargetUnit}
                items={doseUnitOptions}
                placeholder="Unit"
              />
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.inputGroup}>
            <DatePickerSelect
              label="Dosing Frequency *"
              value={frequency}
              onValueChange={(value) => setFrequency(value as FrequencyType)}
              items={frequencyOptions}
              placeholder="Select frequency"
            />
          </View>

          {/* Start Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isMobileWeb && styles.labelMobile]}>
              <Calendar size={16} color="#007AFF" /> Start Date *
            </Text>
            <TextInput
              style={[styles.textInput, isMobileWeb && styles.textInputMobile]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#8E8E93"
            />
          </View>

          {/* Start Time */}
          <View style={styles.inputGroup}>
            <DatePickerSelect
              label="Start Time *"
              value={startTime}
              onValueChange={setStartTime}
              items={timeOptions}
              placeholder="Select time"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)} style={[styles.actions, isMobileWeb && styles.actionsMobile]}>
          <TouchableOpacity
            style={[styles.createButton, !isFormValid && styles.createButtonDisabled]}
            onPress={handleCreateProtocol}
            disabled={!isFormValid || isLoading}
          >
            <Text style={[styles.createButtonText, !isFormValid && styles.createButtonTextDisabled]}>
              {isLoading ? 'Creating...' : 'Create Protocol'}
            </Text>
            {!isLoading && <ArrowRight size={isMobileWeb ? 16 : 18} color={isFormValid ? "#FFFFFF" : "#8E8E93"} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={[styles.skipButtonText, isMobileWeb && styles.skipButtonTextMobile]}>
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  containerMobile: {
    paddingHorizontal: 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  titleMobile: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 17,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '90%',
  },
  subtitleMobile: {
    fontSize: 15,
    lineHeight: 20,
  },
  form: {
    gap: 24,
    marginBottom: 32,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelMobile: {
    fontSize: 15,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textInputMobile: {
    paddingVertical: 14,
    fontSize: 15,
  },
  concentrationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  concentrationInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 17,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actions: {
    gap: 16,
    paddingBottom: 32,
  },
  actionsMobile: {
    paddingBottom: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#F2F2F7',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#8E8E93',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: 17,
    fontWeight: '500',
  },
  skipButtonTextMobile: {
    fontSize: 15,
  },
});