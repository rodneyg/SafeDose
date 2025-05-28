import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  syringeType: 'Insulin' | 'Standard';
  syringeVolume: string;
  recommendedMarking: string | null;
  syringeOptions: { [key: string]: { [key: string]: string } };
};

export default function SyringeIllustration({ syringeType, syringeVolume, recommendedMarking, syringeOptions }: Props) {
  // Insert the exact validation patch requested by @rodneyg
  if (
    !syringeType ||
    !syringeVolume ||
    !syringeOptions[syringeType] ||
    !syringeOptions[syringeType][syringeVolume]
  ) {
    console.warn("Syringe configuration not found:", { 
      syringeType, 
      syringeVolume, 
      hasOptions: !!syringeOptions,
      availableTypes: syringeOptions ? Object.keys(syringeOptions) : []
    });
    return (
      <View style={styles.container}>
        <Text style={styles.noMarkingsText}>⚠️ Invalid syringe configuration. Cannot render illustration.</Text>
      </View>
    );
  }

  const markings = syringeOptions[syringeType][syringeVolume].split(',') || [];

  if (recommendedMarking && !markings.includes(recommendedMarking)) {
    console.warn("Recommended marking not found in markings:", {
      recommendedMarking,
      markings,
    });
    return (
      <View style={styles.container}>
        <Text style={styles.noMarkingsText}>⚠️ Marking not supported for selected syringe.</Text>
      </View>
    );
  }

  console.log('[SyringeIllustration] Rendering with:', {
    syringeType,
    syringeVolume,
    recommendedMarking,
    hasOptions: !!syringeOptions,
    availableTypes: syringeOptions ? Object.keys(syringeOptions) : []
  });

  try {

    const unit = syringeType === 'Insulin' ? 'Units' : 'ml';
    
    // Get markings from syringeOptions - this is guaranteed to exist due to validation above
    const markingsString = syringeOptions[syringeType][syringeVolume];
    
    // Parse markings array - guaranteed to be valid due to validation above
    const markingsArray: number[] = markingsString.split(',').map(m => {
      const parsed = parseFloat(m.trim());
      return isNaN(parsed) ? 0 : parsed;
    });
    
    // Always include 0 as a baseline marking
    const filteredMarkings = [0, ...markingsArray.filter(m => !isNaN(m) && isFinite(m))];
    
    // Calculate maximum marking
    const maxMarking = Math.max(...filteredMarkings);
    
    // Calculate positions for markings
    const syringeWidth = 300;
    const markingPositions = filteredMarkings.map(m => (m / maxMarking) * syringeWidth);
    
    // Calculate recommended marking position
    let recommendedPosition = 0;
    let showRecommendation = false;
    
    if (recommendedMarking !== null && recommendedMarking !== undefined) {
      const recommendedValue = typeof recommendedMarking === 'number' 
        ? recommendedMarking 
        : parseFloat(recommendedMarking);
        
      if (!isNaN(recommendedValue) && isFinite(recommendedValue) && recommendedValue > 0) {
        recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;
        showRecommendation = true;
      }
    }

    // Render the syringe
    return (
      <View style={styles.container}>
        <View style={styles.syringeBody} />
        <View style={styles.syringeLine} />
        
        {/* Render markings */}
        {filteredMarkings.map((m, index) => (
          <View 
            key={`mark-${m}-${index}`} 
            style={[styles.marking, { left: markingPositions[index] }]} 
          />
        ))}
        
        {/* Render labels */}
        {filteredMarkings.map((m, index) => (
          <Text 
            key={`label-${m}-${index}`} 
            style={[styles.markingLabel, { left: markingPositions[index] - 10 }]}
          >
            {m}
          </Text>
        ))}
        
        <Text style={styles.unitLabel}>{unit}</Text>
        
        {/* Render recommendation if valid */}
        {showRecommendation && (
          <>
            <View style={[styles.recommendedMark, { left: recommendedPosition - 2 }]} />
            <Text style={[styles.recommendedText, { left: Math.max(0, recommendedPosition - 30) }]}>
              Draw to here
            </Text>
          </>
        )}
      </View>
    );
  } catch (error) {
    // Final catch-all error handler to prevent component from crashing the app
    console.error('[SyringeIllustration] Unhandled error:', error);
    return (
      <View style={styles.container}>
        <View style={styles.syringeBody} />
        <View style={styles.syringeLine} />
        <Text style={styles.noMarkingsText}>Unable to display syringe</Text>
      </View>
    );
  }
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