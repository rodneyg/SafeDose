import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { isMobileWeb } from '../lib/utils';
import CustomProgressBar from '../components/CustomProgressBar';
import DoseInputStep from '../components/DoseInputStep';
import MedicationSourceStep from '../components/MedicationSourceStep';
import ConcentrationInputStep from '../components/ConcentrationInputStep';
import TotalAmountInputStep from '../components/TotalAmountInputStep';
import ReconstitutionStep from '../components/ReconstitutionStep';
import SyringeStep from '../components/SyringeStep';
import FinalResultDisplay from '../components/FinalResultDisplay';

interface ManualEntryScreenProps {
  manualStep: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
  dose: string;
  setDose: (value: string) => void;
  unit: 'mg' | 'mcg' | 'units';
  setUnit: (value: 'mg' | 'mcg' | 'units') => void;
  substanceName: string;
  setSubstanceName: (value: string) => void;
  medicationInputType: 'concentration' | 'totalAmount' | null;
  setMedicationInputType: (value: 'concentration' | 'totalAmount' | null) => void;
  concentrationAmount: string;
  setConcentrationAmount: (value: string) => void;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  setConcentrationUnit: (value: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  totalAmount: string;
  setTotalAmount: (value: string) => void;
  solutionVolume: string;
  setSolutionVolume: (value: string) => void;
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string };
  setManualSyringe: (value: { type: 'Insulin' | 'Standard'; volume: string }) => void;
  doseValue: number | null;
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration
  recommendedMarking: string | null;
  calculationError: string | null;
  formError: string | null;
  substanceNameHint: string | null;
  setSubstanceNameHint: (value: string | null) => void;
  concentrationHint: string | null;
  setConcentrationHint: (value: string | null) => void;
  totalAmountHint: string | null;
  setTotalAmountHint: (value: string | null) => void;
  syringeHint: string | null;
  setSyringeHint: (value: string | null) => void;
  handleNextDose: () => void;
  handleNextMedicationSource: () => void;
  handleNextConcentrationInput: () => void;
  handleNextTotalAmountInput: () => void;
  handleNextReconstitution: () => void;
  handleCalculateFinal: () => void;
  handleBack: () => void;
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
}

export default function ManualEntryScreen({
  manualStep,
  dose,
  setDose,
  unit,
  setUnit,
  substanceName,
  setSubstanceName,
  medicationInputType,
  setMedicationInputType,
  concentrationAmount,
  setConcentrationAmount,
  concentrationUnit,
  setConcentrationUnit,
  totalAmount,
  setTotalAmount,
  solutionVolume,
  setSolutionVolume,
  manualSyringe,
  setManualSyringe,
  doseValue,
  calculatedVolume,
  calculatedConcentration,
  recommendedMarking,
  calculationError,
  formError,
  substanceNameHint,
  setSubstanceNameHint,
  concentrationHint,
  setConcentrationHint,
  totalAmountHint,
  setTotalAmountHint,
  syringeHint,
  setSyringeHint,
  handleNextDose,
  handleNextMedicationSource,
  handleNextConcentrationInput,
  handleNextTotalAmountInput,
  handleNextReconstitution,
  handleCalculateFinal,
  handleBack,
  handleStartOver,
  setScreenStep,
}: ManualEntryScreenProps) {
  // Validation functions for each step
  const isDoseStepValid = (): boolean => {
    return Boolean(dose && !isNaN(parseFloat(dose)));
  };

  const isMedicationSourceStepValid = (): boolean => {
    return Boolean(medicationInputType === 'concentration' || medicationInputType === 'totalAmount');
  };

  const isConcentrationInputStepValid = (): boolean => {
    return Boolean(concentrationAmount && !isNaN(parseFloat(concentrationAmount)));
  };

  const isTotalAmountInputStepValid = (): boolean => {
    const isValid = Boolean(totalAmount && !isNaN(parseFloat(totalAmount)));
    console.log(`[TotalAmountValidation] totalAmount=${totalAmount}, isValid=${isValid}`);
    return isValid;
  };

  const isReconstitutionStepValid = (): boolean => {
    return Boolean(solutionVolume && !isNaN(parseFloat(solutionVolume)));
  };

  const isSyringeStepValid = (): boolean => {
    return Boolean(manualSyringe && manualSyringe.volume);
  };

  // Function to check if current step is valid
  const isCurrentStepValid = (): boolean => {
    let result = false;
    switch (manualStep) {
      case 'dose': result = isDoseStepValid(); break;
      case 'medicationSource': result = isMedicationSourceStepValid(); break;
      case 'concentrationInput': result = isConcentrationInputStepValid(); break;
      case 'totalAmountInput': result = isTotalAmountInputStepValid(); break;
      case 'reconstitution': result = isReconstitutionStepValid(); break;
      case 'syringe': result = isSyringeStepValid(); break;
      default: result = false;
    }
    console.log(`[ValidationCheck] step=${manualStep}, isValid=${result}`);
    return result;
  };

  let currentStepComponent;
  let progress = 0;

  // Add logging for step changes
  console.log(`[ManualEntryScreen] Rendering step: ${manualStep}`);

  switch (manualStep) {
    case 'dose':
      currentStepComponent = (
        <DoseInputStep
          dose={dose}
          setDose={setDose}
          unit={unit}
          setUnit={setUnit}
        />
      );
      progress = 1 / 3;
      break;
    case 'medicationSource':
      currentStepComponent = (
        <MedicationSourceStep
          substanceName={substanceName}
          setSubstanceName={setSubstanceName}
          setSubstanceNameHint={setSubstanceNameHint}
          substanceNameHint={substanceNameHint}
          medicationInputType={medicationInputType}
          setMedicationInputType={setMedicationInputType}
        />
      );
      progress = (2 / 3) - 0.15;
      break;
    case 'concentrationInput':
      currentStepComponent = (
        <ConcentrationInputStep
          concentrationAmount={concentrationAmount}
          setConcentrationAmount={setConcentrationAmount}
          concentrationUnit={concentrationUnit}
          setConcentrationUnit={setConcentrationUnit}
          setConcentrationHint={setConcentrationHint}
          concentrationHint={concentrationHint}
        />
      );
      progress = 3 / 5;
      break;
    case 'totalAmountInput':
      currentStepComponent = (
        <TotalAmountInputStep
          totalAmount={totalAmount}
          setTotalAmount={setTotalAmount}
          setTotalAmountHint={setTotalAmountHint}
          totalAmountHint={totalAmountHint}
          unit={unit}
          dose={dose}
        />
      );
      progress = 3 / 5;
      break;
    case 'reconstitution':
      currentStepComponent = (
        <ReconstitutionStep
          solutionVolume={solutionVolume}
          setSolutionVolume={setSolutionVolume}
        />
      );
      progress = 2 / 3;
      break;
    case 'syringe':
      currentStepComponent = (
        <SyringeStep
          manualSyringe={manualSyringe}
          setManualSyringe={setManualSyringe}
          setSyringeHint={setSyringeHint}
          syringeHint={syringeHint}
          doseValue={doseValue}
          concentration={medicationInputType === 'concentration' ? parseFloat(concentrationAmount) || null : null}
          unit={unit}
          concentrationUnit={concentrationUnit}
        />
      );
      progress = 3 / 3;
      break;
    case 'finalResult':
      currentStepComponent = (
        <FinalResultDisplay
          calculationError={calculationError}
          recommendedMarking={recommendedMarking}
          doseValue={doseValue}
          unit={unit}
          concentrationUnit={concentrationUnit}
          substanceName={substanceName}
          manualSyringe={manualSyringe}
          calculatedVolume={calculatedVolume}
          calculatedConcentration={calculatedConcentration}
          handleStartOver={handleStartOver}
          setScreenStep={setScreenStep}
          isMobileWeb={isMobileWeb}
        />
      );
      progress = 1;
      break;
    default:
      currentStepComponent = <Text style={styles.errorText}>Invalid step</Text>;
  }

  return (
    <>
      <ScrollView style={styles.manualEntryContainer}>
        <CustomProgressBar progress={progress} />
        <View style={styles.formWrapper}>
          {currentStepComponent}
          {formError && <Text style={styles.errorText}>{formError}</Text>}
          {manualStep !== 'finalResult' && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.backButton, isMobileWeb && styles.backButtonMobile]} 
                onPress={handleBack}
                accessibilityRole="button"
                accessibilityLabel="Go back to previous step">
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  !isCurrentStepValid() && styles.disabledButton,
                  isMobileWeb && styles.nextButtonMobile
                ]}
                onPress={useCallback(() => {
                  try {
                    console.log('[ManualEntry] Next button pressed for step:', manualStep);
                    
                    // If the current step is not valid, do nothing
                    if (!isCurrentStepValid()) return;

                    // Navigate directly to the next step without confirmation
                    if (manualStep === 'dose') {
                      handleNextDose();
                    } else if (manualStep === 'medicationSource') {
                      handleNextMedicationSource();
                    } else if (manualStep === 'concentrationInput') {
                      handleNextConcentrationInput();
                    } else if (manualStep === 'totalAmountInput') {
                      handleNextTotalAmountInput();
                    } else if (manualStep === 'reconstitution') {
                      handleNextReconstitution();
                    } else if (manualStep === 'syringe') {
                      handleCalculateFinal();
                      // Ensure we always proceed to finalResult step even if calculation fails
                      if (manualStep !== 'finalResult') {
                        console.log('[ManualEntry] Manually ensuring transition to finalResult step');
                        setManualStep('finalResult');
                      }
                    }
                  } catch (error) {
                    console.error('Error in next button handler:', error);
                  }
                }, [
                  manualStep,
                  isCurrentStepValid,
                  handleNextDose,
                  handleNextMedicationSource,
                  handleNextConcentrationInput,
                  handleNextTotalAmountInput,
                  handleNextReconstitution,
                  handleCalculateFinal
                ])}
                disabled={!isCurrentStepValid()}
                accessibilityRole="button"
                accessibilityLabel={manualStep === 'syringe' ? "Calculate dose" : "Next step"}
              >
                <Text style={styles.buttonText}>
                  {manualStep === 'syringe' ? 'Calculate' : 'Next'}
                </Text>
                {manualStep !== 'syringe' && <ArrowRight color="#fff" size={18} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  manualEntryContainer: { flex: 1 },
  formWrapper: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20 },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', maxWidth: 600, marginTop: 20, gap: 10 },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { paddingVertical: 14, minHeight: 55 },
  nextButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, width: '45%', minHeight: 50 },
  nextButtonMobile: { paddingVertical: 14, minHeight: 55 },
  disabledButton: { backgroundColor: '#C7C7CC' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
});