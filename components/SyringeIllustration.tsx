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
  
  // Safe conversion of markings array
  const markingsArray = markingsString.split(',').map(m => {
    try {
      return parseFloat(m.trim());
    } catch (e) {
      return 0;
    }
  });
  
  // Filter out invalid values and ensure we have at least one valid marking
  const markings = [0, ...markingsArray.filter(m => !isNaN(m))];
  
  // Ensure max marking is valid
  const maxMarking = Math.max(...markings);
  if (maxMarking <= 0 || !isFinite(maxMarking)) {
    return (
      <View style={styles.container}>
        <View style={styles.syringeBody} />
        <View style={styles.syringeLine} />
        <Text style={styles.noMarkingsText}>Invalid markings for this syringe</Text>
      </View>
    );
  }
  
  // Calculate positions for markings
  const syringeWidth = 300;
  const markingPositions = markings.map(m => (m / maxMarking) * syringeWidth);
  
  // Safe parsing of recommended marking
  let recommendedValue = 0;
  let recommendedPosition = 0;
  
  if (recommendedMarking !== null) {
    try {
      recommendedValue = parseFloat(recommendedMarking);
      // Only calculate position if the parsing succeeded
      if (!isNaN(recommendedValue)) {
        recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;
      }
    } catch (e) {
      // If parsing fails, we won't show the recommended mark
      recommendedValue = 0;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.syringeBody} />
      <View style={styles.syringeLine} />
      {markings.map((m, index) => (
        <View key={`mark-${m}-${index}`} style={[styles.marking, { left: markingPositions[index] }]} />
      ))}
      {markings.map((m, index) => (
        <Text key={`label-${m}-${index}`} style={[styles.markingLabel, { left: markingPositions[index] - 10 }]}>
          {m}
        </Text>
      ))}
      <Text style={styles.unitLabel}>{unit}</Text>
      {recommendedMarking !== null && recommendedValue > 0 && !isNaN(recommendedValue) && (
        <>
          <View style={[styles.recommendedMark, { left: recommendedPosition - 2 }]} />
          <Text style={[styles.recommendedText, { left: Math.max(0, recommendedPosition - 30) }]}>
            Draw to here
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
  unitLabel: { position: 'absolute', left: 270, top: 65, fontSize: 12, color: '#000', fontWeight: 'bold' },
  recommendedMark: { position: 'absolute', top: 20, width: 4, height: 60, backgroundColor: '#FF0000', zIndex: 1 },
  recommendedText: { position: 'absolute', top: 85, fontSize: 12, color: '#FF0000', fontWeight: 'bold' },
  noMarkingsText: { position: 'absolute', top: 65, width: '100%', textAlign: 'center', fontSize: 12, color: '#991B1B', fontWeight: 'bold' },
});