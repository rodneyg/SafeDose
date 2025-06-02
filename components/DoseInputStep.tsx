import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Keyboard } from 'react-native';

type Props = {
  dose: string;
  setDose: (dose: string) => void;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  setUnit: (unit: 'mg' | 'mcg' | 'units' | 'mL') => void;
  formError: string | null;
  validateInput?: (dose: string, unit: 'mg' | 'mcg' | 'units' | 'mL') => boolean;
};

export default function DoseInputStep({ dose, setDose, unit, setUnit, formError, validateInput }: Props) {
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
    <View style={styles.container}>
      <Text style={styles.title}>Step 1: Prescribed Dose</Text>
      <Text style={styles.label}>Dose Amount:</Text>
      <TextInput
        style={styles.input}
        value={dose}
        onChangeText={handleDoseChange}
        keyboardType="numeric"
        inputMode="numeric"
        placeholder="e.g., 100"
        placeholderTextColor="#9ca3af"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={() => {
          // Dismiss keyboard and prevent any layout shifts when submit is pressed
          // This addresses the issue where hitting enter manually makes the layout draggable
          Keyboard.dismiss();
        }}
        // Web-specific props to prevent zoom
        {...(typeof window !== 'undefined' && {
          autoCapitalize: 'none',
          autoCorrect: false,
          spellCheck: false,
        })}
      />
      <Text style={styles.label}>Unit:</Text>
      <View style={styles.radioContainer}>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mg' && styles.radioButtonSelected]}
          onPress={() => handleUnitChange('mg')}
        >
          <Text style={[styles.radioText, unit === 'mg' && styles.radioTextSelected]}>mg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mcg' && styles.radioButtonSelected]}
          onPress={() => handleUnitChange('mcg')}
        >
          <Text style={[styles.radioText, unit === 'mcg' && styles.radioTextSelected]}>mcg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'units' && styles.radioButtonSelected]}
          onPress={() => handleUnitChange('units')}
        >
          <Text style={[styles.radioText, unit === 'units' && styles.radioTextSelected]}>units</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.radioButton, unit === 'mL' && styles.radioButtonSelected]}
          onPress={() => handleUnitChange('mL')}
        >
          <Text style={[styles.radioText, unit === 'mL' && styles.radioTextSelected]}>mL</Text>
        </TouchableOpacity>
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
    maxWidth: '100%', // Prevent any width overflow
    marginBottom: 20,
    // Ultra-aggressive overflow constraints to prevent input content from extending beyond container bounds
    overflow: 'hidden', // Prevent container content from overflowing
    position: 'relative',
    boxSizing: 'border-box',
    // Prevent any transforms or scaling
    transform: 'none',
    transformOrigin: '0 0',
    WebkitTransform: 'none',
    // Lock text size adjustment
    WebkitTextSizeAdjust: 'none',
    MozTextSizeAdjust: 'none',
    msTextSizeAdjust: 'none',
    textSizeAdjust: 'none',
  },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { 
    backgroundColor: '#FFFFFF', 
    color: '#000000', 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 6, 
    fontSize: 16, // Explicitly set to 16px to prevent zoom on iOS
    borderWidth: 1, 
    borderColor: '#E5E5EA', 
    marginBottom: 10, 
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    // Ultra-aggressive mobile web constraints to prevent zoom and scaling
    boxSizing: 'border-box',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
    // Prevent transforms and scaling
    transform: 'none',
    transformOrigin: '0 0',
    WebkitTransform: 'none',
    // Prevent text size adjustment
    WebkitTextSizeAdjust: 'none',
    MozTextSizeAdjust: 'none',
    msTextSizeAdjust: 'none',
    textSizeAdjust: 'none',
    // Prevent any user zoom triggers
    userSelect: 'text',
    WebkitUserSelect: 'text',
    // Lock positioning
    position: 'relative',
    // Ensure no overflow
    overflow: 'visible',
  },
  radioContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, width: '100%' },
  radioButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center', flex: 1, marginHorizontal: 5 },
  radioButtonSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  radioText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  radioTextSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10, marginBottom: 10 },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});