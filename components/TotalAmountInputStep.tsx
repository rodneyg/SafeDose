import React, { useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

type Props = {
  totalAmount: string;
  setTotalAmount: (amount: string) => void;
  setTotalAmountHint: (hint: string | null) => void;
  totalAmountHint: string | null;
  unit: 'mg' | 'mcg' | 'units';
  dose?: string; // Optional dose parameter to enable validation against dose amount
};

export default function TotalAmountInputStep({
  totalAmount,
  setTotalAmount,
  setTotalAmountHint,
  totalAmountHint,
  unit,
  dose = '',
}: Props) {
  // Validate total amount whenever it changes, comparing with dose if available
  useEffect(() => {
    if (totalAmount && dose) {
      // Get numeric values for comparison
      const totalAmountValue = parseFloat(totalAmount);
      const doseValue = parseFloat(dose);
      
      if (!isNaN(totalAmountValue) && !isNaN(doseValue)) {
        // For mcg unit, we need to convert for comparison since total amount is in mg
        const adjustedDose = unit === 'mcg' ? doseValue / 1000 : doseValue;
        
        if (adjustedDose > totalAmountValue) {
          setTotalAmountHint(`Warning: The dose (${dose} ${unit}) may exceed the total amount available (${totalAmount} ${unit === 'mcg' ? 'mg' : unit}). This could result in calculation errors.`);
        } else {
          setTotalAmountHint(null);
        }
      }
    }
  }, [totalAmount, dose, unit, setTotalAmountHint]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Enter Total Amount</Text>
      <Text style={styles.label}>Total Amount in Vial ({unit === 'mcg' ? 'mg' : unit}):</Text>
      <TextInput
        style={styles.input}
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
  warningHint: { color: '#B45309', backgroundColor: 'rgba(251, 191, 36, 0.1)', padding: 8, borderRadius: 4 },
  helperText: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4, marginBottom: 10 },
});