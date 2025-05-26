import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Camera as CameraIcon, Pill, Syringe } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { isMobileWeb } from '../lib/utils';

interface IntroScreenProps {
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  resetFullForm: (startStep?: 'dose') => void;
}

export default function IntroScreen({ setScreenStep, resetFullForm }: IntroScreenProps) {
  // Use memoized handlers to ensure stable references across renders
  const handleScanPress = useCallback(() => {
    setScreenStep('scan');
  }, [setScreenStep]);
  
  const handleManualEntryPress = useCallback(() => {
    // Ensure we reset form state before changing screens
    resetFullForm('dose');
    setScreenStep('manualEntry');
  }, [resetFullForm, setScreenStep]);
  
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.content}>
      <Syringe color={'#6ee7b7'} size={64} style={styles.icon} />
      <Text style={styles.text}>Welcome! Calculate your dose accurately.</Text>
      <View style={styles.disclaimerContainer}>
        <Text style={styles.disclaimerText}>
          **Medical Disclaimer**: This app is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making any decisions regarding medication or treatment. Incorrect dosing can lead to serious health risks.
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.button, isMobileWeb && styles.buttonMobile]} 
        onPress={handleScanPress}>
        <CameraIcon color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Scan Items</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.manualButton, isMobileWeb && styles.buttonMobile]}
        onPress={handleManualEntryPress}
      >
        <Pill color={'#fff'} size={20} style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Enter Details Manually</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 20 },
  icon: { marginBottom: 16 },
  text: { fontSize: 16, color: '#000000', textAlign: 'center', paddingHorizontal: 16 },
  disclaimerContainer: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginVertical: 10, width: '90%', alignSelf: 'center' },
  disclaimerText: { fontSize: 12, color: '#856404', textAlign: 'center', fontStyle: 'italic' },
  button: { backgroundColor: '#007AFF', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '80%', minHeight: 50 },
  buttonMobile: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 60 },
  manualButton: { backgroundColor: '#6366f1' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
});