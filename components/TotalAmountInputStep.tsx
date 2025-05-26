import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

type Props = {
  totalAmount: string;
  setTotalAmount: (amount: string) => void;
  setTotalAmountHint: (hint: string | null) => void;
  totalAmountHint: string | null;
  unit: 'mg' | 'mcg' | 'units';
};

export default function TotalAmountInputStep({
  totalAmount,
  setTotalAmount,
  setTotalAmountHint,
  totalAmountHint,
  unit,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Enter Total Amount</Text>
      <Text style={styles.label}>Total Amount in Vial ({unit === 'mcg' ? 'mg' : unit}):</Text>
      <TextInput
        style={styles.input}
        value={totalAmount}
        onChangeText={(text) => {
          setTotalAmount(text);
          setTotalAmountHint(null);
        }}
        keyboardType="numeric"
        placeholder="e.g., 50"
        placeholderTextColor="#9ca3af"
      />
      {totalAmountHint && <Text style={styles.helperHint}>{totalAmountHint}</Text>}
      <Text style={styles.helperText}>
        Enter the total amount of substance in the vial as a number. Unit is '{unit === 'mcg' ? 'mg' : unit}'.
        {unit === 'mcg' && ' (Note: Converted to mcg for calculation.)'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', color: '#000000', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 6, fontSize: 15, borderWidth: 1, borderColor: '#E5E5EA', marginBottom: 10, width: '100%' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});