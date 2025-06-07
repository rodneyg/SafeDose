import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera, Edit3 } from 'lucide-react-native';

interface Props {
  selectedMethod: 'manual' | 'scan' | null;
  onSelectMethod: (method: 'manual' | 'scan') => void;
}

export default function ReconstitutionInputMethodStep({ selectedMethod, onSelectMethod }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How do you want to enter vial info?</Text>
      <Text style={styles.subtitle}>
        Choose how you'd like to provide the peptide amount information
      </Text>

      <View style={styles.methodsContainer}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            selectedMethod === 'scan' && styles.methodButtonSelected,
          ]}
          onPress={() => onSelectMethod('scan')}
        >
          <Camera 
            color={selectedMethod === 'scan' ? '#fff' : '#007AFF'} 
            size={32} 
          />
          <Text style={[
            styles.methodButtonText,
            selectedMethod === 'scan' && styles.methodButtonTextSelected,
          ]}>
            Scan Vial Label
          </Text>
          <Text style={[
            styles.methodButtonSubtext,
            selectedMethod === 'scan' && styles.methodButtonSubtextSelected,
          ]}>
            Take a photo of your vial to extract peptide amount
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodButton,
            selectedMethod === 'manual' && styles.methodButtonSelected,
          ]}
          onPress={() => onSelectMethod('manual')}
        >
          <Edit3 
            color={selectedMethod === 'manual' ? '#fff' : '#007AFF'} 
            size={32} 
          />
          <Text style={[
            styles.methodButtonText,
            selectedMethod === 'manual' && styles.methodButtonTextSelected,
          ]}>
            Enter Manually
          </Text>
          <Text style={[
            styles.methodButtonSubtext,
            selectedMethod === 'manual' && styles.methodButtonSubtextSelected,
          ]}>
            Type in the peptide amount from your vial
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  methodsContainer: {
    width: '100%',
    gap: 16,
  },
  methodButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  methodButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  methodButtonTextSelected: {
    color: '#fff',
  },
  methodButtonSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  methodButtonSubtextSelected: {
    color: '#E3F2FD',
  },
});