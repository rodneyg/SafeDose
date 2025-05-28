import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { CameraIcon, Plus, X } from 'lucide-react-native';
import SyringeIllustration from './SyringeIllustration';
import { syringeOptions } from "../lib/utils";

type Props = {
  calculationError: string | null;
  recommendedMarking: string | null;
  doseValue: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'ml';  // Added 'ml' as a valid unit type
  concentrationUnit?: 'mg/ml' | 'mcg/ml' | 'units/ml'; // Add concentrationUnit prop
  substanceName: string;
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration prop
  precisionNote?: string | null; // Add precision note prop
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  isMobileWeb: boolean;
};

export default function FinalResultDisplay({
  calculationError,
  recommendedMarking,
  doseValue,
  unit,
  concentrationUnit,
  substanceName,
  manualSyringe,
  calculatedVolume,
  calculatedConcentration,
  precisionNote,
  handleStartOver,
  setScreenStep,
  isMobileWeb,
}: Props) {
  // Safety check - ensure we have default values for all critical props to prevent rendering errors
  const safeCalculationError = calculationError || null;
  const safeDoseValue = doseValue || 0;
  const safeUnit = unit || 'mg';
  const safeConcentrationUnit = concentrationUnit || 'mg/ml';
  const safeSubstanceName = substanceName || 'medication';
  const safeManualSyringe = manualSyringe || { type: 'Standard' as const, volume: '3 ml' };
  
  // Ensure recommendedMarking is safely handled - it can be string or number in different parts of the app
  let safeRecommendedMarking: string | null = null;
  if (recommendedMarking !== null && recommendedMarking !== undefined) {
    if (typeof recommendedMarking === 'number') {
      safeRecommendedMarking = recommendedMarking.toString();
    } else if (typeof recommendedMarking === 'string') {
      safeRecommendedMarking = recommendedMarking;
    }
  }
  
  // Ensure calculatedVolume is safe to use with toFixed()
  const safeCalculatedVolume = (calculatedVolume !== null && 
    calculatedVolume !== undefined && 
    !isNaN(calculatedVolume) &&
    isFinite(calculatedVolume)) ? calculatedVolume : null;
    
  // Ensure calculatedConcentration is safe to use with toFixed()
  const safeCalculatedConcentration = (calculatedConcentration !== null && 
    calculatedConcentration !== undefined && 
    !isNaN(calculatedConcentration) &&
    isFinite(calculatedConcentration)) ? calculatedConcentration : null;

  console.log('[FinalResultDisplay] Rendering with:', { 
    calculationError: safeCalculationError, 
    recommendedMarking: safeRecommendedMarking,
    doseValue: safeDoseValue,
    unit: safeUnit,
    concentrationUnit: safeConcentrationUnit,
    substanceName: safeSubstanceName,
    manualSyringe: safeManualSyringe ? JSON.stringify(safeManualSyringe) : null,
    calculatedVolume: safeCalculatedVolume,
    calculatedConcentration: safeCalculatedConcentration,
    precisionNote
  });
  
  // Explicit type checks for rendering values
  try {
    // First handle a successful calculation case - if we have a calculatedVolume without errors,
    // we should show the recommendation
    const hasValidCalculation = safeCalculatedVolume !== null && 
      safeCalculatedVolume !== undefined && 
      isFinite(safeCalculatedVolume) &&
      safeCalculatedVolume > 0;
    
    // Additional guard: Ensure concentration is also valid if available
    const hasValidConcentration = safeCalculatedConcentration === null || 
      (safeCalculatedConcentration !== undefined && 
       isFinite(safeCalculatedConcentration));
    
    // Show recommendation section if we have a valid calculation, regardless of recommendedMarking
    // This ensures we always show a result when the calculation succeeds
    const showRecommendation = hasValidCalculation && safeCalculationError === null && hasValidConcentration;
    
    // Show error section when there's an explicit error
    const showError = safeCalculationError !== null;
    
    // Show the "no recommendation" section if we have neither an error nor a valid calculation
    // IMPORTANT: This ensures we always display something, even in edge cases
    const showNoRecommendation = !showError && !showRecommendation;
    
    console.log('[FinalResultDisplay] Display logic:', {
      hasValidCalculation,
      showError,
      showRecommendation,
      showNoRecommendation,
      calculationError: safeCalculationError,
      calculatedVolume: safeCalculatedVolume,
      recommendedMarking: safeRecommendedMarking,
      precisionNote
    });
    
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {showError && (
          <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171', flexDirection: 'column', alignItems: 'center' }]}>
            <X color="#f87171" size={24} style={{ marginBottom: 10 }} />
            <Text style={styles.errorTitle}>Calculation Error</Text>
            <Text style={styles.errorText}>{safeCalculationError}</Text>
            <Text style={styles.errorHelpText}>
              {safeCalculationError && safeCalculationError.includes('exceeds total amount') && 
                'Try reducing the dose amount or selecting a medication with a higher total amount.'}
              {safeCalculationError && safeCalculationError.includes('exceeds what can be made') && 
                'Try selecting a medication with a higher concentration or total amount.'}
              {safeCalculationError && safeCalculationError.includes('exceeds syringe capacity') && 
                'Try selecting a syringe with a larger capacity or reducing the dose amount.'}
              {safeCalculationError && safeCalculationError.includes('Unit mismatch') && 
                'The dose unit and concentration unit are not compatible. Ensure they match (e.g., mg dose with mg/mL concentration, or units dose with units/mL concentration). Note that mcg and mg are convertible with the right concentration units.'}
              {safeCalculationError && safeCalculationError.includes('too small to measure') && 
                'The calculated volume is too small for accurate measurement with standard syringes. Try using a lower concentration or higher dose amount.'}
            </Text>
            {/* Display calculated values even when there's an error if they're available */}
            {safeCalculationError && safeCalculatedVolume !== null && 
             isFinite(safeCalculatedVolume) && safeCalculatedVolume < 0.01 && (
              <View style={styles.smallVolumeInfo}>
                <Text style={styles.smallVolumeText}>
                  Technical details: {safeDoseValue} {safeUnit} with {safeConcentrationUnit} concentration would require {safeCalculatedVolume.toFixed(6)} mL
                </Text>
              </View>
            )}
          </View>
        )}
        {showNoRecommendation && (
          <View style={[styles.instructionCard, { backgroundColor: '#EFF6FF', borderColor: '#60A5FA' }]}>
            <Text style={[styles.instructionTitle, { color: '#1E40AF' }]}>
              Dose Calculation
            </Text>
            <Text style={[styles.instructionText, { color: '#1E40AF' }]}>
              {safeDoseValue ? `For ${safeDoseValue} ${safeUnit} dose` : 'For the requested dose'} 
              {safeSubstanceName ? ` of ${safeSubstanceName}` : ''}:
            </Text>
            <Text style={[styles.instructionTextLarge, { color: '#1E40AF' }]}>
              No specific recommendation available
            </Text>
            <Text style={[styles.instructionNote, { color: '#1E40AF' }]}>
              Please check your inputs and try again, or consult a healthcare professional.
            </Text>
          </View>
        )}
        {showRecommendation && (
          <View style={[styles.instructionCard, { backgroundColor: '#D1FAE5', borderColor: '#34D399' }]}>
            <Text style={styles.instructionTitle}>
              ✅ Dose Calculation Result
            </Text>
            <Text style={styles.instructionText}>
              For a {safeDoseValue} {safeUnit} dose of {safeSubstanceName || 'this medication'}:
            </Text>
            <Text style={styles.instructionTextLarge}>
              {(() => {
                // Use a function to safely determine what to display
                try {
                  if (safeRecommendedMarking && safeRecommendedMarking !== 'null' && safeRecommendedMarking !== 'undefined') {
                    return `Draw up to the ${safeRecommendedMarking} mark`;
                  } else if (safeCalculatedVolume !== null && isFinite(safeCalculatedVolume)) {
                    return `Draw up ${safeCalculatedVolume.toFixed(2)} ml`;
                  } else {
                    return "Draw up the calculated dose";
                  }
                } catch (error) {
                  console.error('[FinalResultDisplay] Error rendering dose text:', error);
                  return "Draw up the required dose";
                }
              })()}
            </Text>
            <Text style={styles.instructionNote}>
              ({safeManualSyringe.type === 'Insulin' ? 'Units mark on Insulin Syringe' : 'ml mark on Standard Syringe'})
            </Text>
            {typeof safeCalculatedVolume === 'number' && isFinite(safeCalculatedVolume) && (
              <Text style={styles.instructionNote}>
                (Exact calculated volume: {safeCalculatedVolume.toFixed(2)} ml)
              </Text>
            )}
            {typeof safeCalculatedConcentration === 'number' && isFinite(safeCalculatedConcentration) && (
              <Text style={styles.instructionNote}>
                (Calculated concentration: {safeCalculatedConcentration.toFixed(2)} {safeConcentrationUnit || 'mg/mL'})
              </Text>
            )}
            {/* Added support for displaying precision notes that aren't blocking errors */}
            {precisionNote && (
              <Text style={styles.warningText}>{precisionNote}</Text>
            )}
            <View style={styles.illustrationContainer}>
              <Text style={styles.instructionNote}>Syringe Illustration (recommended mark highlighted)</Text>
              {/* Safely wrap SyringeIllustration with enhanced error handling */}
              <React.Fragment>
                {(() => {
                  try {
                    // Double-check we have valid syringe options before attempting to render
                    const hasSyringeOptions = !!(syringeOptions && 
                      safeManualSyringe && 
                      safeManualSyringe.type && 
                      safeManualSyringe.volume &&
                      syringeOptions[safeManualSyringe.type] &&
                      syringeOptions[safeManualSyringe.type][safeManualSyringe.volume]);
                      
                    if (!hasSyringeOptions) {
                      console.warn('[FinalResultDisplay] Missing syringe details:', {
                        hasSyringeOptions: !!syringeOptions,
                        syringe: safeManualSyringe ? JSON.stringify(safeManualSyringe) : null
                      });
                      return <Text style={styles.errorText}>Unable to display syringe illustration: missing data</Text>;
                    }
                    
                    return (
                      <SyringeIllustration
                        syringeType={safeManualSyringe.type}
                        syringeVolume={safeManualSyringe.volume}
                        recommendedMarking={safeRecommendedMarking}
                        syringeOptions={syringeOptions}
                      />
                    );
                  } catch (error) {
                    console.error('[FinalResultDisplay] Error rendering syringe illustration:', error);
                    return <Text style={styles.errorText}>Unable to display syringe illustration: rendering error</Text>;
                  }
                })()}
              </React.Fragment>
            </View>
          </View>
        )}
        <View style={styles.disclaimerContainer}>
          <Text style={styles.disclaimerText}>
            **Medical Disclaimer**: This calculation is for informational purposes only. It is not a substitute for professional medical advice. Verify all doses with a healthcare provider before administration to avoid potential health risks. Incorrect dosing can lead to serious harm.
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }, isMobileWeb && styles.actionButtonMobile]} onPress={handleStartOver}>
            <Plus color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>New Dose</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6' }, isMobileWeb && styles.actionButtonMobile]} onPress={() => setScreenStep('scan')}>
            <CameraIcon color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  } catch (error) {
    // Fallback rendering in case of any error
    console.error('[FinalResultDisplay] Render error:', error);
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={[styles.instructionCard, { backgroundColor: '#FEE2E2', borderColor: '#F87171' }]}>
          <Text style={styles.errorTitle}>Display Error</Text>
          <Text style={styles.errorText}>
            There was a problem displaying the calculation result. Please try again with different inputs.
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={handleStartOver}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, width: '100%', maxWidth: 600, marginBottom: 20 },
  instructionCard: { padding: 16, borderRadius: 12, borderWidth: 2, marginBottom: 16, width: '100%' },
  instructionTitle: { fontSize: 18, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginBottom: 12 },
  instructionText: { fontSize: 15, color: '#065F46', textAlign: 'center', marginBottom: 8 },
  instructionTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#065F46', textAlign: 'center', marginVertical: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 6 },
  instructionNote: { fontSize: 13, color: '#065F46', textAlign: 'center', marginTop: 4, fontStyle: 'italic' },
  warningText: { fontSize: 13, color: '#92400E', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 6, borderRadius: 6, width: '90%', alignSelf: 'center' },
  illustrationContainer: { marginTop: 20, alignItems: 'center' },
  disclaimerContainer: { backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginVertical: 10, width: '90%', alignSelf: 'center' },
  disclaimerText: { fontSize: 12, color: '#856404', textAlign: 'center', fontStyle: 'italic' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, gap: 10 },
  actionButton: { paddingVertical: 14, borderRadius: 8, flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, minHeight: 50 },
  actionButtonMobile: { paddingVertical: 16, minHeight: 60 },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
  errorTitle: { fontSize: 16, color: '#991B1B', textAlign: 'center', fontWeight: '600', marginVertical: 8 },
  errorText: { fontSize: 15, color: '#991B1B', textAlign: 'center', fontWeight: '500', marginLeft: 8, flexShrink: 1 },
  errorHelpText: { fontSize: 13, color: '#991B1B', textAlign: 'center', marginTop: 12, paddingVertical: 8, backgroundColor: 'rgba(248, 113, 113, 0.1)', paddingHorizontal: 12, borderRadius: 6, width: '90%', alignSelf: 'center' },
  smallVolumeInfo: { marginTop: 12, padding: 8, backgroundColor: 'rgba(248, 113, 113, 0.05)', borderRadius: 6, width: '90%', alignSelf: 'center' },
  smallVolumeText: { fontSize: 12, color: '#991B1B', textAlign: 'center', fontStyle: 'italic' },
});