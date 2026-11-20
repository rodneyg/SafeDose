import { AmountUnit } from '../lib/dosing';
import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { isMobileWeb } from '../lib/utils';

type Props = {
  totalAmount: string;
  setTotalAmount: (amount: string) => void;
  setTotalAmountHint: (hint: string | null) => void;
  totalAmountHint: string | null;
  unit: AmountUnit | null;
  setUnit: (unit: AmountUnit) => void;
  dose?: string; // Optional dose parameter to enable validation against dose amount
};

export default function TotalAmountInputStep({
  totalAmount,
  setTotalAmount,
  setTotalAmountHint,
  totalAmountHint,
  unit,
  setUnit,
  dose = '',
}: Props) {
  return (
    <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Enter Total Amount</Text>
      <Text style={styles.label}>Total Amount in Vial ({unit || 'select unit'}):</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Total amount unit" style={{ flexDirection: 'row', gap: 16 }}>
        {(['mg', 'mcg', 'units'] as const).map(option => (
          <TouchableOpacity
            key={option}
            onPress={() => setUnit(option)}
            accessibilityLabel={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: unit === option }}
            aria-checked={unit === option}
          >
            <Text style={{ fontWeight: unit === option ? '700' : '400' }}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Total amount in vial"
        aria-required
        style={[styles.input, isMobileWeb && styles.inputMobile]}
        value={totalAmount}
        onChangeText={(text) => {
          setTotalAmount(text);
          // Don't clear the hint here so that validation can run
        }}
        keyboardType="numeric"
        placeholder="e.g., 50"
        placeholderTextColor="#9ca3af"
      />
      {totalAmountHint && <Text style={[styles.helperHint, styles.warningHint]}>{totalAmountHint}</Text>}
      <Text style={styles.helperText}>
        Enter the total amount of substance in the vial as a number. Unit is '{unit || 'select unit'}'.

      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
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
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  inputMobile: {
    paddingVertical: 8, // Reduced vertical padding for small screens
    paddingHorizontal: 12, // Reduced horizontal padding
    marginBottom: 8, // Tighter spacing
  },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  warningHint: { color: '#B45309', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 8, borderRadius: 4 },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});