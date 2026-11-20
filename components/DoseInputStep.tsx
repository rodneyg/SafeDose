import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { isMobileWeb } from '../lib/utils';

type Props = {
  dose: string;
  setDose: (dose: string) => void;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  setUnit: (unit: 'mg' | 'mcg' | 'units' | 'mL') => void;
  formError: string | null;
  validateInput?: (dose: string, unit: 'mg' | 'mcg' | 'units' | 'mL') => boolean;
};

export default function DoseInputStep({ dose, setDose, unit, setUnit, formError, validateInput }: Props) {
  // Debug: Log when dose values change
  React.useEffect(() => {
    console.log('[DoseInputStep] ========== DOSE INPUT STEP RENDERED ==========');
    console.log('[DoseInputStep] Received props:', { 
      dose: dose || '(empty)', 
      unit,
      formError: formError || '(none)'
    });
    console.log('[DoseInputStep] ================================================');
  }, [dose, unit, formError]);

  // Validate dose input on change
  const handleDoseChange = (value: string) => {
    setDose(value);
    // If a validation function is provided, use it
    if (validateInput) {
      validateInput(value, unit);
    }
  };

  // Validate when unit changes
  const handleUnitChange = (newUnit: 'mg' | 'mcg' | 'units' | 'mL') => {
    setUnit(newUnit);
    // If a validation function is provided, use it
    if (validateInput && dose) {
      validateInput(dose, newUnit);
    }
  };

  return (
    <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Prescribed Dose</Text>
      <Text style={styles.label}>Dose Amount:</Text>
      <TextInput
        accessibilityLabel="Dose amount"
        aria-required
        style={[styles.input, isMobileWeb && styles.inputMobile]}
        value={dose}
        onChangeText={handleDoseChange}
        keyboardType="numeric"
        inputMode="numeric"
        placeholder="e.g., 100"
        placeholderTextColor="#9ca3af"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => {
          // Dismiss keyboard on submit
          Keyboard.dismiss();
        }}
      />
      <Text style={styles.label}>Unit:</Text>
      <View style={[styles.radioContainer, isMobileWeb && styles.radioContainerMobile]}>
        {(['mg', 'mcg', 'units', 'mL'] as const).map(option => (
          <TouchableOpacity
            key={option}
            style={[styles.radioButton, unit === option && styles.radioButtonSelected, isMobileWeb && styles.radioButtonMobile]}
            accessibilityRole="button"
            accessibilityLabel={option}
            accessibilityState={{ selected: unit === option }}
            aria-pressed={unit === option}
            onPress={() => handleUnitChange(option)}
          >
            <Text style={[styles.radioText, unit === option && styles.radioTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {formError && <Text style={styles.errorText}>{formError}</Text>}
      <Text style={styles.helperText}>Enter the prescribed dose amount and select the unit.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    backgroundColor: '#FFFFFF', 
    padding: 16, 
    borderRadius: 8, 
    width: '100%', 
    maxWidth: '100%',
    marginBottom: 20,
    overflow: 'hidden',
    margin: 0
  },
  containerMobile: {
    padding: 12, // Reduced padding for small screens
    marginBottom: 16, // Reduced margin for tighter layout
  },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  titleMobile: {
    fontSize: 16, // Smaller title font for small screens
    marginBottom: 12, // Reduced margin
  },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { 
    backgroundColor: '#FFFFFF', 
    color: '#000000', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderRadius: 6, 
    fontSize: 16, // 16px prevents iOS zoom
    borderWidth: 1, 
    borderColor: '#E5E5EA', 
    marginBottom: 10, 
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    ...Platform.select({ web: { outlineStyle: 'none' as const } })
  },
  inputMobile: {
    paddingVertical: 8, // Reduced vertical padding for small screens
    paddingHorizontal: 12, // Reduced horizontal padding
    marginBottom: 8, // Tighter spacing
  },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, width: '100%' },
  radioContainerMobile: {
    marginBottom: 8, // Reduced bottom margin
    gap: 4, // Smaller gap between radio buttons
  },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', flex: 1, marginHorizontal: 5 },
  radioButtonMobile: {
    paddingVertical: 8, // Reduced vertical padding for smaller buttons
    paddingHorizontal: 12, // Reduced horizontal padding
    marginHorizontal: 2, // Smaller margins between buttons
  },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10, marginBottom: 10 },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});