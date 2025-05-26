import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  progress: number;
};

export default function CustomProgressBar({ progress }: Props) {
  const totalSteps = 3;
  const currentStep = Math.round(progress * totalSteps);
  const progressWidth = `${progress * 100}%`;

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={[styles.fill, { width: progressWidth }]} />
      </View>
      <Text style={styles.text}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10, paddingHorizontal: 16 },
  background: { height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 2 },
  text: { fontSize: 12, color: '#8E8E93', textAlign: 'center', marginTop: 4 },
});