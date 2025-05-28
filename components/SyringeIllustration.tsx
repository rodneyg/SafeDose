import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  syringeType: 'Insulin' | 'Standard';
  syringeVolume: string;
  recommendedMarking: string | null;
  syringeOptions: { [key: string]: { [key: string]: string } };
};

export default function SyringeIllustration({ syringeType, syringeVolume, recommendedMarking, syringeOptions }: Props) {
  console.log('[SyringeIllustration] Rendering with:', {
    syringeType,
    syringeVolume,
    recommendedMarking,
    hasOptions: !!syringeOptions
  });

  try {
    // Safety check for props
    if (!syringeType || !syringeVolume || !syringeOptions) {
      console.error('[SyringeIllustration] Missing required props:', {
        syringeType, syringeVolume, hasOptions: !!syringeOptions
      });
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>Missing syringe information</Text>
        </View>
      );
    }

    const unit = syringeType === 'Insulin' ? 'Units' : 'ml';
    
    // Safely access markings with defensive checks at each level
    const typeMappings = syringeOptions[syringeType];
    if (!typeMappings) {
      console.error(`[SyringeIllustration] No options found for syringe type: ${syringeType}`);
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>No markings found for {syringeType} type</Text>
        </View>
      );
    }
    
    const markingsString = typeMappings[syringeVolume];
    if (!markingsString) {
      console.error(`[SyringeIllustration] No markings for ${syringeType} ${syringeVolume}`);
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>No markings available for {syringeVolume} syringe</Text>
        </View>
      );
    }
    
    // Safe conversion of markings array with explicit error handling
    let markingsArray: number[] = [];
    try {
      markingsArray = markingsString.split(',').map(m => {
        const parsed = parseFloat(m.trim());
        return isNaN(parsed) ? 0 : parsed;
      });
      console.log(`[SyringeIllustration] Parsed markings: ${JSON.stringify(markingsArray)}`);
    } catch (error) {
      console.error('[SyringeIllustration] Error parsing markings:', error);
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>Error parsing syringe markings</Text>
        </View>
      );
    }
    
    // Filter out invalid values and ensure we have at least one valid marking
    // Always include 0 as a baseline marking
    const markings = [0, ...markingsArray.filter(m => !isNaN(m) && isFinite(m))];
    
    // Check for empty markings array after filtering
    if (markings.length <= 1) { // only has the 0 we added
      console.error('[SyringeIllustration] No valid markings found after filtering');
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>No valid markings found for this syringe</Text>
        </View>
      );
    }
    
    // Safely find maximum marking with explicit error handling
    let maxMarking = 0;
    try {
      maxMarking = Math.max(...markings);
      if (maxMarking <= 0 || !isFinite(maxMarking)) {
        throw new Error(`Invalid max marking: ${maxMarking}`);
      }
    } catch (error) {
      console.error('[SyringeIllustration] Error calculating max marking:', error);
      return (
        <View style={styles.container}>
          <View style={styles.syringeBody} />
          <View style={styles.syringeLine} />
          <Text style={styles.noMarkingsText}>Invalid markings data for this syringe</Text>
        </View>
      );
    }
    
    // Calculate positions for markings - with safety checks
    const syringeWidth = 300;
    const markingPositions = markings.map(m => {
      // Ensure position is valid, defaulting to 0 if calculation fails
      try {
        const position = (m / maxMarking) * syringeWidth;
        return isNaN(position) || !isFinite(position) ? 0 : position;
      } catch (e) {
        console.error(`[SyringeIllustration] Error calculating position for marking ${m}:`, e);
        return 0;
      }
    });
    
    // Safe parsing of recommended marking with comprehensive error handling
    let recommendedValue = 0;
    let recommendedPosition = 0;
    let showRecommendation = false;
    
    if (recommendedMarking !== null && recommendedMarking !== undefined) {
      try {
        // Handle both string and number types for recommendedMarking
        recommendedValue = typeof recommendedMarking === 'number' 
          ? recommendedMarking 
          : parseFloat(recommendedMarking);
          
        // Validate the parsed value
        if (!isNaN(recommendedValue) && isFinite(recommendedValue) && recommendedValue > 0) {
          recommendedPosition = (recommendedValue / maxMarking) * syringeWidth;
          showRecommendation = true;
          console.log(`[SyringeIllustration] Valid recommended marking: ${recommendedValue}, position: ${recommendedPosition}`);
        } else {
          console.warn(`[SyringeIllustration] Invalid recommended marking: ${recommendedMarking} -> ${recommendedValue}`);
        }
      } catch (error) {
        console.error(`[SyringeIllustration] Error processing recommendedMarking: ${recommendedMarking}`, error);
        showRecommendation = false;
      }
    }

    // Render the syringe with all safety guards in place
    return (
      <View style={styles.container}>
        <View style={styles.syringeBody} />
        <View style={styles.syringeLine} />
        
        {/* Only render markings if positions array has valid values */}
        {markings.length > 0 && markingPositions.length === markings.length && 
          markings.map((m, index) => (
            <View 
              key={`mark-${m}-${index}`} 
              style={[styles.marking, { left: markingPositions[index] }]} 
            />
          ))
        }
        
        {/* Only render labels if positions array has valid values */}
        {markings.length > 0 && markingPositions.length === markings.length && 
          markings.map((m, index) => (
            <Text 
              key={`label-${m}-${index}`} 
              style={[styles.markingLabel, { left: markingPositions[index] - 10 }]}
            >
              {m}
            </Text>
          ))
        }
        
        <Text style={styles.unitLabel}>{unit}</Text>
        
        {/* Only render recommendation if all values are valid */}
        {showRecommendation && recommendedPosition > 0 && isFinite(recommendedPosition) && (
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