import { SyringeSelection, getSyringeMarkings } from '../lib/dosing';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { insulinVolumes, standardVolumes, isMobileWeb } from '../lib/utils';

type Props = {
  manualSyringe: SyringeSelection;
  setManualSyringe: (syringe: SyringeSelection) => void;
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
  const needsCapacitySelection = manualSyringe.needsConfirmation || !manualSyringe.volume;
  const availableVolumes = manualSyringe.needsConfirmation ? [] : manualSyringe.type === 'Insulin' ? (manualSyringe.insulinScale === 'U-40' ? ['0.5 ml', '1 ml'] : insulinVolumes) : standardVolumes;
  const isValidSyringeOption = getSyringeMarkings(manualSyringe);

  // Helper function to check if a syringe type has any valid markings for any volume
  const hasValidOptions = (type: 'Insulin' | 'Standard') => {
    const volumes = type === 'Insulin' ? insulinVolumes : standardVolumes;
    return volumes.some(volume => getSyringeMarkings({ type, volume }));
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

  return (
    <View style={[styles.container, isMobileWeb && styles.containerMobile]}>
      <Text style={[styles.title, isMobileWeb && styles.titleMobile]}>Syringe Details</Text>
      <Text style={styles.label}>Syringe Type:</Text>
      <View style={styles.infoContainer}>
        <Info color={'#6B7280'} size={12} style={styles.infoIcon} />
        <Text style={styles.infoText}>Choose based on what your syringe says.</Text>
      </View>
      <View style={[styles.presetContainer, isMobileWeb && styles.presetContainerMobile]}>
        <TouchableOpacity
          style={[
            styles.optionButton, 
            !manualSyringe.needsConfirmation && manualSyringe.type === 'Insulin' && styles.selectedOption,
            !hasValidInsulinOptions && styles.disabledOption,
            isMobileWeb && styles.optionButtonMobile,
          ]}
          onPress={() => {
            if (!hasValidInsulinOptions) {
              setSyringeHint("No compatible insulin syringes for this dose.");
              return;
            }
            setManualSyringe({ type: 'Insulin', volume: needsCapacitySelection ? '' : insulinVolumes[2], insulinScale: manualSyringe.insulinScale || 'U-100', needsScaleConfirmation: manualSyringe.needsScaleConfirmation });
            setSyringeHint(null);
          }}
        >
          <Text style={[
            styles.buttonText, 
            !manualSyringe.needsConfirmation && manualSyringe.type === 'Insulin' && styles.selectedButtonText,
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
            !manualSyringe.needsConfirmation && manualSyringe.type === 'Standard' && styles.selectedOption,
            !hasValidStandardOptions && styles.disabledOption,
            isMobileWeb && styles.optionButtonMobile,
          ]}
          onPress={() => {
            if (!hasValidStandardOptions) {
              setSyringeHint("No compatible standard syringes for this dose.");
              return;
            }
            setManualSyringe({ type: 'Standard', volume: needsCapacitySelection ? '' : standardVolumes[1] });
            setSyringeHint(null);
          }}
        >
          <Text style={[
            styles.buttonText, 
            !manualSyringe.needsConfirmation && manualSyringe.type === 'Standard' && styles.selectedButtonText,
            !hasValidStandardOptions && styles.disabledButtonText
          ]}>
            <Text style={styles.syringeTypeLabel}>Standard Syringes</Text>
            {'\n'}
            <Text style={styles.volumePreview}>({standardVolumesDisplay})</Text>
          </Text>
        </TouchableOpacity>
      </View>
      {syringeHint && <Text style={styles.helperHint}>{syringeHint}</Text>}
      {manualSyringe.type === 'Insulin' && !manualSyringe.needsConfirmation && (
        <>
          <Text style={styles.label}>Insulin scale printed on syringe:</Text>
          <View style={styles.presetContainer}>
            {['U-100', 'U-40'].map(scale => (
              <TouchableOpacity key={scale} style={[styles.optionButton, !manualSyringe.needsScaleConfirmation && (manualSyringe.insulinScale || 'U-100') === scale && styles.selectedOption]}
                onPress={() => { setManualSyringe({ ...manualSyringe, insulinScale: scale, needsScaleConfirmation: false }); setSyringeHint(null); }}>
                <Text style={styles.buttonText}>{scale}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
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
          Markings ({manualSyringe.type === 'Insulin' ? 'units' : 'ml'}): {getSyringeMarkings(manualSyringe)}
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