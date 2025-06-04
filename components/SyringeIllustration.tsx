import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  syringeType: 'Insulin' | 'Standard';
  syringeVolume: string;
  recommendedMarking: string | null;
  syringeOptions: { [key: string]: { [key: string]: string } };
};

export default function SyringeIllustration({ syringeType, syringeVolume, recommendedMarking, syringeOptions }: Props) {
  const unit = syringeType === 'Insulin' ? 'Units' : 'ml';
  const markingsString = syringeOptions[syringeType]?.[syringeVolume];
  
  // Check if markings are available before proceeding
  if (!markingsString) {
    // Return a simple placeholder view when markings are unavailable
    return (
      <View style={styles.container}>
        <View style={styles.syringeBody} />
        <View style={styles.syringeLine} />
        <Text style={styles.noMarkingsText}>No markings available for this syringe</Text>
      </View>
    );
  }
  
  const markings = [0, ...markingsString.split(',').map(m => parseFloat(m))];
  const maxMarking = Math.max(...markings);
  const syringeWidth = 300;
  const markingPositions = markings.map(m => (m / maxMarking) * syringeWidth);
  const recommendedValue = parseFloat(recommendedMarking || '0');
  const recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;

  return (
    <View style={styles.container}>
      <View style={styles.syringeBody} />
      <View style={styles.syringeLine} />
      {markings.map((m, index) => (
        <View key={m} style={[styles.marking, { left: markingPositions[index] }]} />
      ))}
      {markings.map((m, index) => (
        <Text key={`label-${m}`} style={[styles.markingLabel, { left: markingPositions[index] - 10 }]}>
          {m}
        </Text>
      ))}
      <Text style={styles.unitLabel}>{unit}</Text>
      {recommendedMarking && (
        <>
          <View style={[styles.recommendedMark, { left: recommendedPosition - 2 }]} />
          <View style={[styles.precisionIndicator, { left: recommendedPosition - 1 }]} />
          <Text style={[styles.recommendedText, { left: Math.max(0, recommendedPosition - 35) }]}>
            Draw to {recommendedValue.toFixed(2)} {unit}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 300, height: 100, position: 'relative' },
  syringeBody: { position: 'absolute', left: 0, top: 40, width: 300, height: 20, backgroundColor: '#E0E0E0', borderRadius: 10 },
  syringeLine: { position: 'absolute', left: 0, top: 50, width: 300, height: 2, backgroundColor: '#000' },
  marking: { position: 'absolute', top: 40, width: 1, height: 20, backgroundColor: '#000' },
  markingLabel: { position: 'absolute', top: 65, fontSize: 10 },
  unitLabel: { position: 'absolute', left: 250, top: 20, fontSize: 12, color: '#000', fontWeight: 'bold' },
  recommendedMark: { position: 'absolute', top: 20, width: 4, height: 60, backgroundColor: '#FF0000', zIndex: 1 },
  precisionIndicator: { position: 'absolute', top: 18, width: 2, height: 64, backgroundColor: '#FFD700', zIndex: 2 },
  recommendedText: { position: 'absolute', top: 85, fontSize: 10, color: '#FF0000', fontWeight: 'bold' },
  noMarkingsText: { position: 'absolute', top: 65, width: '100%', textAlign: 'center', fontSize: 12, color: '#991B1B', fontWeight: 'bold' },
});