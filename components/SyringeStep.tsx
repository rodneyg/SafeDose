import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { insulinVolumes, standardVolumes, syringeOptions, isMobileWeb } from '../lib/utils';

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
  medicationInputType?: 'concentration' | 'totalAmount' | null;
};

export default function SyringeStep({ 
  manualSyringe, 
  setManualSyringe, 
  setSyringeHint, 
  syringeHint,
  doseValue,
  concentration,
  unit,
  concentrationUnit,
  medicationInputType
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

  // Pre-computed display strings for better performance
  const insulinVolumesDisplay = insulinVolumes.map(volume => {
    if (volume === '0.3 ml') return '1/3';
    if (volume === '0.5 ml') return '1/2';
    if (volume === '1 ml') return '1mL';
    return volume;
  }).join(', ');

  const standardVolumesDisplay = standardVolumes.map(volume => 
    volume.replace(' ml', 'mL')
  ).join(', ');

  // Function to find a valid syringe based on the current selection and context
  const findValidSyringe = (): { type: 'Insulin' | 'Standard'; volume: string } => {
    // Determine smart defaults based on available context
    let suggestedType: 'Insulin' | 'Standard' = 'Standard';
    let suggestedVolume = '3 ml'; // Default to standard 3ml

    // Use dose and concentration if available - prioritize smart defaults when context is available
    if (doseValue !== undefined && doseValue !== null && 
        unit) {
      
      // Check if this is insulin
      const isInsulin = unit === 'units' || concentrationUnit?.includes('units');
      
      // If insulin units, prefer insulin syringe
      if (isInsulin && hasValidInsulinOptions) {
        suggestedType = 'Insulin';
        suggestedVolume = '1 ml'; // Default to 1ml insulin syringe
      } 
      // Smart defaults for mcg doses - these often need precision (like 500mcg peptides)
      else if (unit === 'mcg') {
        if (doseValue <= 1000) {
          // Very small mcg doses (≤1000mcg) - prefer insulin for precision
          if (hasValidInsulinOptions) {
            suggestedType = 'Insulin';
            suggestedVolume = '1 ml';
          } else {
            suggestedType = 'Standard';
            suggestedVolume = '1 ml';
          }
        } else if (doseValue <= 5000) {
          // Small-medium mcg doses (1000-5000mcg) - prefer insulin if using total amount
          if (medicationInputType === 'totalAmount' && hasValidInsulinOptions) {
            suggestedType = 'Insulin';
            suggestedVolume = '1 ml';
          } else {
            suggestedType = 'Standard';
            suggestedVolume = '1 ml';
          }
        } else {
          // Larger mcg doses - use standard syringes
          suggestedType = 'Standard';
          suggestedVolume = doseValue <= 15000 ? '3 ml' : '5 ml';
        }
      }
      // Smart defaults for mg doses
      else if (unit === 'mg') {
        if (doseValue <= 5) {
          // Small mg doses - standard 1ml for precision
          suggestedType = 'Standard';
          suggestedVolume = '1 ml';
        } else if (doseValue <= 50) {
          // Medium mg doses (5-50mg) - standard 3ml
          suggestedType = 'Standard';
          suggestedVolume = '3 ml';
        } else {
          // Large mg doses (>50mg like 100mg TRT) - larger syringe
          suggestedType = 'Standard';
          suggestedVolume = '5 ml';
        }
      }
      // Fallback for other units
      else {
        suggestedType = 'Standard';
        suggestedVolume = '3 ml';
      }
    }
    // If no dose context available, check if current selection is valid and return it
    else if (isValidSyringeOption) {
      return manualSyringe;
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

  // Set smart defaults when component mounts or when dose context changes
  useEffect(() => {
    // Only run smart defaults if we have dose context to work with
    if (doseValue !== undefined && doseValue !== null && unit) {
      const validSyringe = findValidSyringe();
      // Only update if the suggested syringe is different from current selection
      if (validSyringe.type !== manualSyringe.type || validSyringe.volume !== manualSyringe.volume) {
        setManualSyringe(validSyringe);
        setSyringeHint('Auto-selected best matching syringe for this dose');
      }
    }
    // Also handle case where current syringe is completely invalid (no markings)
    else if (!isValidSyringeOption) {
      const validSyringe = findValidSyringe();
      setManualSyringe(validSyringe);
      setSyringeHint('Auto-selected valid syringe');
    }
  }, [doseValue, unit, medicationInputType, concentrationUnit]);

  return (
    <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Step 3: Syringe Details</Text>
      <Text style={styles.label}>Syringe Type:</Text>
      <View style={styles.infoContainer}>
        <Info color={'#6B7280'} size={12} style={styles.infoIcon} />
        <Text style={styles.infoText}>Choose based on what your syringe says.</Text>
      </View>
      <View style={[styles.presetContainer, isMobileWeb && styles.presetContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionButton, 
            manualSyringe.type === 'Insulin' && styles.selectedOption,
            !hasValidInsulinOptions && styles.disabledOption,
            isMobileWeb && styles.optionButtonMobile,
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
          ]}>
            <Text style={styles.syringeTypeLabel}>Insulin Syringes</Text>
            {'\n'}
            <Text style={styles.volumePreview}>({insulinVolumesDisplay})</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton, 
            manualSyringe.type === 'Standard' && styles.selectedOption,
            !hasValidStandardOptions && styles.disabledOption,
            isMobileWeb && styles.optionButtonMobile,
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
          ]}>
            <Text style={styles.syringeTypeLabel}>Standard Syringes</Text>
            {'\n'}
            <Text style={styles.volumePreview}>({standardVolumesDisplay})</Text>
          </Text>
        </TouchableOpacity>
      </View>
      {syringeHint && <Text style={styles.helperHint}>{syringeHint}</Text>}
      <Text style={styles.label}>Syringe Volume:</Text>
      <View style={styles.presetContainer}>
        {availableVolumes.map((volume) => (
          <TouchableOpacity
            key={volume}
            style={[styles.optionButton, manualSyringe.volume === volume && styles.selectedOption]}
            onPress={() => setManualSyringe({ ...manualSyringe, volume })}
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
  containerMobile: {
    padding: 12, // Reduced padding for small screens
    marginBottom: 16, // Reduced margin for tighter layout
  },
  title: { fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 16, textAlign: 'center' },
  titleMobile: {
    fontSize: 16, // Smaller title font for small screens
    marginBottom: 12, // Reduced margin
  },
  label: { fontSize: 14, color: '#000000', marginTop: 10, marginBottom: 6 },
  presetContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4, marginBottom: 8, width: '100%' },
  presetContainerMobile: {
    gap: 6, // Smaller gap between buttons for small screens
    marginBottom: 6, // Tighter margin
  },
  optionButton: { backgroundColor: '#E5E5EA', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', marginHorizontal: 5, minHeight: 48 },
  optionButtonMobile: {
    paddingVertical: 6, // Reduced vertical padding for small screens
    paddingHorizontal: 10, // Reduced horizontal padding
    marginHorizontal: 3, // Smaller margins between buttons
    minHeight: 44, // Minimum height for mobile to accommodate two lines
  },
  selectedOption: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  disabledOption: { backgroundColor: '#D1D1D6', borderColor: 'transparent', opacity: 0.6 },
  buttonText: { color: '#000000', fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  selectedButtonText: { color: '#ffffff', fontWeight: 'bold' },
  disabledButtonText: { color: '#6B6B6B' },
  syringeTypeLabel: { fontWeight: '600' },
  volumePreview: { fontSize: 12, fontWeight: '400', opacity: 0.8 },
  infoContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  infoIcon: { 
    marginRight: 6,
  },
  infoText: { 
    fontSize: 12, 
    color: '#6B7280', 
    fontStyle: 'italic',
    flex: 1,
  },
  helperHint: { fontSize: 12, color: '#6B7280', textAlign: 'left', marginTop: 2, marginBottom: 8, fontStyle: 'italic' },
  inferredMarkings: { fontSize: 13, color: '#8E8E93', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});