import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { insulinVolumes, standardVolumes, syringeOptions } from '../lib/utils';

type Props = {
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  setManualSyringe: (syringe: { type: 'Insulin' | 'Standard'; volume: string }) => void;
  setSyringeHint: (hint: string | null) => void;
  syringeHint: string | null;
  // Optional context for smarter defaults
  doseValue?: number | null;
  concentration?: number | null;
  unit?: string;
  concentrationUnit?: string;
};

export default function SyringeStep({ 
  manualSyringe, 
  setManualSyringe, 
  setSyringeHint, 
  syringeHint,
  doseValue,
  concentration,
  unit,
  concentrationUnit
}: Props) {
  const availableVolumes = manualSyringe.type === 'Insulin' ? insulinVolumes : standardVolumes;
  const isValidSyringeOption = syringeOptions[manualSyringe.type]?.[manualSyringe.volume];

  // Helper function to check if a syringe type has any valid markings for any volume
  const hasValidOptions = (type: 'Insulin' | 'Standard') => {
    const volumes = type === 'Insulin' ? insulinVolumes : standardVolumes;
    return volumes.some(volume => syringeOptions[type]?.[volume]);
  };
  
  const hasValidInsulinOptions = hasValidOptions('Insulin');
  const hasValidStandardOptions = hasValidOptions('Standard');

  // Function to find a valid syringe based on the current selection and context
  const findValidSyringe = () => {
    // First, check if the current selection is valid
    if (isValidSyringeOption) {
      return manualSyringe;
    }

    // Determine smart defaults based on available context
    let suggestedType: 'Insulin' | 'Standard' = 'Standard';
    let suggestedVolume = '3 ml'; // Default to standard 3ml

    // Use dose and concentration if available
    if (doseValue !== undefined && doseValue !== null && 
        concentration !== undefined && concentration !== null &&
        unit && concentrationUnit) {
      
      // Check if this is insulin
      const isInsulin = unit === 'units' || concentrationUnit?.includes('units');
      
      // If insulin units, prefer insulin syringe
      if (isInsulin && hasValidInsulinOptions) {
        suggestedType = 'Insulin';
        suggestedVolume = '1 ml'; // Default to 1ml insulin syringe
      } 
      // For small doses, prefer smaller syringes
      else if ((unit === 'mg' && doseValue <= 5) || 
               (unit === 'mcg' && doseValue <= 5000)) {
        suggestedType = 'Standard';
        suggestedVolume = '1 ml'; // Small dose = small syringe
      }
      // For medium doses, use medium syringes
      else if ((unit === 'mg' && doseValue <= 15) || 
               (unit === 'mcg' && doseValue <= 15000)) {
        suggestedType = 'Standard';
        suggestedVolume = '3 ml';
      }
      // For larger doses, use larger syringes
      else {
        suggestedType = 'Standard';
        suggestedVolume = '5 ml';
      }
    }

    // Verify the suggested syringe has valid markings
    if (syringeOptions[suggestedType]?.[suggestedVolume]) {
      return { type: suggestedType, volume: suggestedVolume };
    }

    // If the smart suggestion doesn't work, fall back to simpler logic
    // Try to keep the same type but find a valid volume
    const currentType = manualSyringe.type;
    const volumes = currentType === 'Insulin' ? insulinVolumes : standardVolumes;
    
    // Find the first valid volume for the current type
    for (const volume of volumes) {
      if (syringeOptions[currentType]?.[volume]) {
        return { type: currentType, volume };
      }
    }

    // If no valid options for the current type, try the other type
    const alternateType = currentType === 'Insulin' ? 'Standard' : 'Insulin';
    const alternateVolumes = alternateType === 'Insulin' ? insulinVolumes : standardVolumes;
    
    for (const volume of alternateVolumes) {
      if (syringeOptions[alternateType]?.[volume]) {
        return { type: alternateType, volume };
      }
    }

    // Default to Standard 3ml if nothing else works
    return { type: 'Standard', volume: '3 ml' };
  };

  // Set valid defaults when component mounts or if current syringe is invalid
  useEffect(() => {
    if (!isValidSyringeOption) {
      const validSyringe = findValidSyringe();
      setManualSyringe(validSyringe);
      setSyringeHint('Auto-selected best matching syringe');
    }
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step 3: Syringe Details</Text>
      <Text style={styles.label}>Syringe Type:</Text>
      <View style={styles.presetContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton, 
            manualSyringe.type === 'Insulin' && styles.selectedOption,
            !hasValidInsulinOptions && styles.disabledOption
          ]}
          onPress={() => {
            if (!hasValidInsulinOptions) {
              setSyringeHint("No compatible insulin syringes for this dose.");
              return;
            }
            setManualSyringe({ type: 'Insulin', volume: insulinVolumes[2] });
            setSyringeHint(null);
          }}
        >
          <Text style={[
            styles.buttonText, 
            manualSyringe.type === 'Insulin' && styles.selectedButtonText,
            !hasValidInsulinOptions && styles.disabledButtonText
          ]}>Insulin (units)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton, 
            manualSyringe.type === 'Standard' && styles.selectedOption,
            !hasValidStandardOptions && styles.disabledOption
          ]}
          onPress={() => {
            if (!hasValidStandardOptions) {
              setSyringeHint("No compatible standard syringes for this dose.");
              return;
            }
            setManualSyringe({ type: 'Standard', volume: standardVolumes[1] });
            setSyringeHint(null);
          }}
        >
          <Text style={[
            styles.buttonText, 
            manualSyringe.type === 'Standard' && styles.selectedButtonText,
            !hasValidStandardOptions && styles.disabledButtonText
          ]}>Standard (ml)</Text>
        </TouchableOpacity>
      </View>
      {syringeHint && <Text style={styles.helperHint}>{syringeHint}</Text>}
      <Text style={styles.label}>Syringe Volume:</Text>
      <View style={styles.presetContainer}>
        {availableVolumes.map((volume) => (
          <TouchableOpacity
            key={volume}
            style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]}
            onPress={() => setManualSyringe((prev) => ({ ...prev, volume }))}
          >
            <Text style={[styles.buttonText, manualSyringe.volume === volume && styles.selectedButtonText]}>{volume}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isValidSyringeOption ? (
        <Text style={styles.inferredMarkings}>
          Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {syringeOptions[manualSyringe.type][manualSyringe.volume]}
        </Text>
      ) : (
        <Text style={[styles.inferredMarkings, { color: '#991B1B', fontWeight: 'bold' }]}>Markings unavailable.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '100%' },
  optionButton: { backgroundColor: '#E5E5EA', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, flex: 1, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', marginHorizontal: 5 },
  selectedOption: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  disabledOption: { backgroundColor: '#D1D1D6', borderColor: 'transparent', opacity: 0.6 },
  buttonText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  disabledButtonText: { color: '#6B6B6B' },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  inferredMarkings: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});