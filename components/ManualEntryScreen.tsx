import { getManualProgress } from '../lib/manualProgress';
import { SyringeSelection } from '../lib/dosing';
import { AmountUnit, formatDoseNumber, parseDoseInput, validateUnitCompatibility } from '../lib/dosing';
import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../lib/analytics';
import { isMobileWeb } from '../lib/utils';
import CustomProgressBar from '../components/CustomProgressBar';
import DoseInputStep from '../components/DoseInputStep';
import MedicationSourceStep from '../components/MedicationSourceStep';
import ConcentrationInputStep from '../components/ConcentrationInputStep';
import TotalAmountInputStep from '../components/TotalAmountInputStep';
import ReconstitutionStep from '../components/ReconstitutionStep';
import SyringeStep from '../components/SyringeStep';
import PreDoseConfirmationStep from '../components/PreDoseConfirmationStep';
import FinalResultDisplay from '../components/FinalResultDisplay';
import DosingPresets from '../components/DosingPresets';
import { DosingPreset } from '../lib/dosingPresets';

interface ManualEntryScreenProps {
  manualStep: 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'preDoseConfirmation' | 'finalResult';
  dose: string;
  setDose: (value: string) => void;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  setUnit: (value: 'mg' | 'mcg' | 'units' | 'mL') => void;
  substanceName: string;
  setSubstanceName: (value: string) => void;
  medicationInputType: 'concentration' | 'totalAmount' | null;
  setMedicationInputType: (value: 'concentration' | 'totalAmount' | null) => void;
  concentrationAmount: string;
  setConcentrationAmount: (value: string) => void;
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  setConcentrationUnit: (value: 'mg/ml' | 'mcg/ml' | 'units/ml') => void;
  totalAmountUnit: AmountUnit | null;
  setTotalAmountUnit: (value: AmountUnit) => void;
  totalAmount: string;
  setTotalAmount: (value: string) => void;
  solutionVolume: string;
  setSolutionVolume: (value: string) => void;
  manualSyringe: SyringeSelection;
  setManualSyringe: (value: SyringeSelection) => void;
  doseValue: number | null;
  calculatedVolume: number | null;
  calculatedConcentration?: number | null; // Add calculated concentration
  recommendedMarking: string | null;
  calculationError: string | null;
  guidance?: string | null;
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
  handleNextPreDoseConfirmation: () => void;
  handleBack: () => void;
  handleStartOver: () => void;
  setScreenStep: (step: 'intro' | 'scan' | 'manualEntry') => void;
  handleGoToFeedback: (nextAction: 'new_dose' | 'scan_again' | 'start_over') => void;
  onDoseSaved?: (localDoseCount?: number) => void;
  lastActionType: 'manual' | 'scan' | null;
  validateDoseInput?: (dose: string, unit: 'mg' | 'mcg' | 'units' | 'mL') => boolean;
  validateConcentrationInput?: (amount: string, unit: 'mg/ml' | 'mcg/ml' | 'units/ml') => boolean;
  usageData?: { scansUsed: number; limit: number; plan: string };
  onTryAIScan?: () => void;
  onApplyPreset?: (preset: DosingPreset) => void;
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
  totalAmountUnit,
  setTotalAmountUnit,
  solutionVolume,
  setSolutionVolume,
  manualSyringe,
  setManualSyringe,
  doseValue,
  calculatedVolume,
  calculatedConcentration,
  recommendedMarking,
  calculationError,
  guidance,
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
  handleNextPreDoseConfirmation,
  handleBack,
  handleStartOver,
  setScreenStep,
  handleGoToFeedback,
  onDoseSaved,
  lastActionType,
  validateDoseInput,
  validateConcentrationInput,
  usageData,
  onTryAIScan,
  onApplyPreset,
}: ManualEntryScreenProps) {
  useEffect(() => {
    logAnalyticsEvent(ANALYTICS_EVENTS.MANUAL_ENTRY_STARTED);
  }, []); // Empty dependency array ensures this runs only on mount

  // Debug: Log the props being received to diagnose "Use Last Dose" prefill issue
  useEffect(() => {
    console.log('[ManualEntryScreen] ========== PROPS RECEIVED ==========');
    console.log('[ManualEntryScreen] Props received:', {
      manualStep,
      dose: dose || '(empty)',
      unit,
      substanceName: substanceName || '(empty)',
      medicationInputType,
      concentrationAmount: concentrationAmount || '(empty)',
      concentrationUnit,
      substanceNameHint: substanceNameHint || '(none)',
      concentrationHint: concentrationHint || '(none)',
      syringeHint: syringeHint || '(none)',
      manualSyringe: manualSyringe || '(none)'
    });
    console.log('[ManualEntryScreen] ==========================================');
  }, [manualStep, dose, unit, substanceName, medicationInputType, concentrationAmount, concentrationUnit, substanceNameHint, concentrationHint, syringeHint, manualSyringe]);

  // Validation functions for each step
  const isPositiveFiniteInput = (value: string): boolean => {
    const parsed = parseDoseInput(value);
    return value.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;
  };

  const isDoseStepValid = (): boolean => {
    return isPositiveFiniteInput(dose);
  };

  const isMedicationSourceStepValid = (): boolean => {
    return Boolean(medicationInputType === 'concentration' || medicationInputType === 'totalAmount');
  };

  const isConcentrationInputStepValid = (): boolean => {
    // Check for valid concentration input
    const valid = isPositiveFiniteInput(concentrationAmount);
    
    // Also validate unit compatibility if both units are set
    if (valid && unit && concentrationUnit) {
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      if (!compatibility.isValid) {
        return false;
      }
    }
    
    return valid;
  };

  const isTotalAmountInputStepValid = (): boolean => {
    const isValid = isPositiveFiniteInput(totalAmount);
    console.log(`[TotalAmountValidation] totalAmount=${totalAmount}, isValid=${isValid}`);
    return isValid;
  };

  const isReconstitutionStepValid = (): boolean => {
    return Boolean(solutionVolume && !isNaN(parseDoseInput(solutionVolume)));
  };

  const isSyringeStepValid = (): boolean => {
    return Boolean(manualSyringe && manualSyringe.volume);
  };

  const isPreDoseConfirmationStepValid = (): boolean => {
    // Blocking errors prevent progression; guidance does not.
    return calculatedVolume !== null && !calculationError && recommendedMarking !== null;
  };

  // Function to check if current step is valid
  // Centralizes validation logic to prevent progression with incomplete/invalid data
  // Each step has specific validation requirements based on the medical calculation workflow
  const isCurrentStepValid = (): boolean => {
    let result = false;
    switch (manualStep) {
      case 'dose': result = isDoseStepValid(); break;
      case 'medicationSource': result = isMedicationSourceStepValid(); break;
      case 'concentrationInput': result = isConcentrationInputStepValid(); break;
      case 'totalAmountInput': result = isTotalAmountInputStepValid(); break;
      case 'reconstitution': result = isReconstitutionStepValid(); break;
      case 'syringe': result = isSyringeStepValid(); break;
      case 'preDoseConfirmation': result = isPreDoseConfirmationStepValid(); break;
      default: result = false;
    }
    console.log(`[ValidationCheck] step=${manualStep}, isValid=${result}`);
    return result;
  };

  const getCurrentStepError = (): string | null => {
    if (manualStep === 'dose' && !isDoseStepValid()) {
      return 'Enter a dose greater than zero.';
    }
    if (manualStep === 'concentrationInput') {
      if (!isPositiveFiniteInput(concentrationAmount)) {
        return 'Enter a concentration greater than zero.';
      }
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      if (!compatibility.isValid) {
        return compatibility.errorMessage;
      }
    }
    if (manualStep === 'totalAmountInput' && !isTotalAmountInputStepValid()) {
      return 'Enter a total amount greater than zero.';
    }
    return null;
  };

  // Create a handler for next button press
  // This function orchestrates the step-by-step validation and navigation flow
  // ensuring users can only proceed when current step data is valid
  const handleNextButtonPress = useCallback(() => {
    try {
      console.log('[ManualEntryScreen] ========== STEP NAVIGATION ==========');
      console.log('[ManualEntryScreen] Next button pressed for step:', manualStep);
      console.log('[ManualEntryScreen] Current form state:', {
        dose,
        unit,
        substanceName,
        medicationInputType,
        concentrationAmount,
        concentrationUnit,
        totalAmount,
        syringeType: manualSyringe?.type,
        syringeVolume: manualSyringe?.volume
      });
      
      // If the current step is not valid, do nothing
      const isValid = isCurrentStepValid();
      console.log('[ManualEntryScreen] Step validation result:', isValid);
      if (!isValid) {
        console.log('[ManualEntryScreen] Step invalid, preventing navigation');
        return;
      }

      // Navigate directly to the next step without confirmation
      console.log('[ManualEntryScreen] Navigating from step:', manualStep);
      if (manualStep === 'dose') {
        console.log('[ManualEntryScreen] → Calling handleNextDose()');
        handleNextDose();
      } else if (manualStep === 'medicationSource') {
        console.log('[ManualEntryScreen] → Calling handleNextMedicationSource()');
        handleNextMedicationSource();
      } else if (manualStep === 'concentrationInput') {
        console.log('[ManualEntryScreen] → Calling handleNextConcentrationInput()');
        handleNextConcentrationInput();
      } else if (manualStep === 'totalAmountInput') {
        console.log('[ManualEntryScreen] → Calling handleNextTotalAmountInput()');
        handleNextTotalAmountInput();
      } else if (manualStep === 'reconstitution') {
        console.log('[ManualEntryScreen] → Calling handleNextReconstitution()');
        handleNextReconstitution();
      } else if (manualStep === 'syringe') {
        console.log('[ManualEntryScreen] → Calling handleCalculateFinal()');
        handleCalculateFinal();
      } else if (manualStep === 'preDoseConfirmation') {
        console.log('[ManualEntryScreen] → Calling handleNextPreDoseConfirmation()');
        handleNextPreDoseConfirmation();
      }
      console.log('[ManualEntryScreen] ✅ Navigation action completed');
    } catch (error) {
      console.error('[ManualEntryScreen] ❌ Error in next button handler:', error);
    }
  }, [
    manualStep,
    isCurrentStepValid,
    handleNextDose,
    handleNextMedicationSource,
    handleNextConcentrationInput,
    handleNextTotalAmountInput,
    handleNextReconstitution,
    handleCalculateFinal,
    handleNextPreDoseConfirmation
  ]);

  let currentStepComponent;

  // Add logging for step changes
  console.log(`[ManualEntryScreen] Rendering step: ${manualStep}`);

  switch (manualStep) {
    case 'dose':
      currentStepComponent = (
        <><DosingPresets mode="apply" onApply={onApplyPreset} /><DoseInputStep
          dose={dose}
          setDose={setDose}
          unit={unit}
          setUnit={setUnit}
          formError={formError}
          validateInput={validateDoseInput}
        /></>
      );
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
          dose={dose}
          unit={unit}
        />
      );
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
          doseUnit={unit}
          formError={formError}
        />
      );
      break;
    case 'totalAmountInput':
      currentStepComponent = (
        <TotalAmountInputStep
          totalAmount={totalAmount}
          setTotalAmount={setTotalAmount}
          setTotalAmountHint={setTotalAmountHint}
          totalAmountHint={totalAmountHint}
          unit={totalAmountUnit}
          setUnit={setTotalAmountUnit}
          dose={dose}
        />
      );
      break;
    case 'reconstitution':
      currentStepComponent = (
        <ReconstitutionStep
          solutionVolume={solutionVolume}
          setSolutionVolume={setSolutionVolume}
        />
      );
      break;
    case 'syringe':
      currentStepComponent = (
        <SyringeStep
          manualSyringe={manualSyringe}
          setManualSyringe={setManualSyringe}
          setSyringeHint={setSyringeHint}
          syringeHint={syringeHint}
          doseValue={doseValue}
          concentration={medicationInputType === 'concentration' ? parseDoseInput(concentrationAmount) || null : null}
          unit={unit}
          concentrationUnit={concentrationUnit}
          medicationInputType={medicationInputType}
        />
      );
      break;
    case 'preDoseConfirmation':
      // Total-amount entry leaves concentrationAmount empty (or from an earlier path).
      // Use the calculator's derived strength for both review summaries.
      const reviewConcentrationAmount = medicationInputType === 'totalAmount'
        ? (calculatedConcentration != null && calculatedConcentration > 0
          ? formatDoseNumber(calculatedConcentration, 3)
          : '')
        : concentrationAmount;
      currentStepComponent = (
        <PreDoseConfirmationStep
          substanceName={substanceName}
          inputSummary={[
            `${concentrationHint?.includes('scan') ? 'Scanned strength: ' : 'Strength: '}${reviewConcentrationAmount} ${concentrationUnit}`,
            `${totalAmountHint?.includes('scan') ? 'Scanned vial amount: ' : 'Vial amount: '}${totalAmount || 'Not provided'} ${totalAmountUnit || ''}`,
            medicationInputType === 'totalAmount' && unit !== 'mL' && solutionVolume
              ? `Solution volume: ${solutionVolume} mL`
              : null,
            `${syringeHint?.includes('scan') ? 'Scanned syringe: ' : 'Syringe: '}${manualSyringe.type} ${String(manualSyringe.volume).replace(/ml/i, 'mL')} syringe (${manualSyringe.type === 'Insulin' ? manualSyringe.insulinScale || 'U-100' : 'mL scale'})`,
          ].filter(Boolean).join('\n')}
          concentrationAmount={reviewConcentrationAmount}
          concentrationUnit={concentrationUnit}
          doseValue={doseValue}
          unit={unit}
          calculatedVolume={calculatedVolume}
          calculatedConcentration={calculatedConcentration}
          guidance={guidance}
          calculationError={calculationError}
        />
      );
      break;
    case 'finalResult':
      // Calculate the concentration value to pass to FinalResultDisplay
      const concentrationValue = medicationInputType === 'concentration' 
        ? (parseDoseInput(concentrationAmount) || null)
        : (calculatedConcentration || null);
        
      currentStepComponent = (
        <><FinalResultDisplay
          guidance={guidance}
          calculationError={calculationError}
          recommendedMarking={recommendedMarking}
          doseValue={doseValue}
          unit={unit}
          concentrationUnit={concentrationUnit}
          substanceName={substanceName}
          manualSyringe={manualSyringe}
          calculatedVolume={calculatedVolume}
          calculatedConcentration={calculatedConcentration}
          concentration={concentrationValue}
          handleStartOver={handleStartOver}
          setScreenStep={setScreenStep}
          handleGoToFeedback={handleGoToFeedback}
          onDoseSaved={onDoseSaved}
          lastActionType={lastActionType}
          isMobileWeb={isMobileWeb}
          usageData={usageData}
          onTryAIScan={onTryAIScan}
        /><DosingPresets mode="save" preset={{ dose, unit, substanceName, medicationInputType: medicationInputType || 'concentration', concentrationAmount, concentrationUnit, totalAmount, totalAmountUnit, solutionVolume, manualSyringe }} /></>
      );
      break;
    default:
      currentStepComponent = <Text style={styles.errorText}>Invalid step</Text>;
  }

  const isReviewStep = manualStep === 'preDoseConfirmation';
  const stepButtons = (
    <View style={[styles.buttonContainer, isMobileWeb && styles.buttonContainerMobile]}>
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
        onPress={handleNextButtonPress}
        disabled={!isCurrentStepValid()}
        accessibilityRole="button"
        accessibilityLabel={manualStep === 'syringe' ? "Calculate dose" : isReviewStep ? "Proceed to result" : "Next step"}
      >
        <Text style={styles.buttonText}>
          {manualStep === 'syringe' ? 'Calculate' : isReviewStep ? 'Confirm' : 'Next'}
        </Text>
        {manualStep !== 'syringe' && !isReviewStep && <ArrowRight color="#fff" size={18} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <ScrollView 
        style={isReviewStep ? [styles.manualEntryContainer, styles.reviewScrollView] : styles.manualEntryContainer}
        contentContainerStyle={styles.scrollViewContent}
        scrollEnabled={true}
        bounces={false}
        alwaysBounceHorizontal={false}
        directionalLockEnabled={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        <CustomProgressBar {...getManualProgress(manualStep, medicationInputType)} />
        <View style={[styles.formWrapper, isMobileWeb && styles.formWrapperMobile, isReviewStep && styles.reviewContent]}>
          {currentStepComponent}
          {formError && <Text style={styles.errorText}>{formError}</Text>}
          {!formError && getCurrentStepError() && (
            <Text accessibilityRole="alert" style={styles.errorText}>{getCurrentStepError()}</Text>
          )}
          {!isReviewStep && manualStep !== 'finalResult' && stepButtons}
        </View>
      </ScrollView>
      {isReviewStep && (
        <View style={[styles.formWrapper, isMobileWeb && styles.formWrapperMobile]}>
          {stepButtons}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  manualEntryContainer: { 
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  reviewScrollView: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%'
  },
  formWrapper: { 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingBottom: 20,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden'
  },
  formWrapperMobile: {
    paddingHorizontal: 12, // Reduced padding for small screens
    paddingBottom: 16, // Tighter bottom padding
  },
  reviewContent: { paddingBottom: 0 },
  errorText: { fontSize: 14, color: '#f87171', textAlign: 'center', padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, marginTop: 10 },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    maxWidth: '100%',
    marginTop: 20, 
    gap: 10,
    overflow: 'hidden'
  },
  buttonContainerMobile: {
    marginTop: 16, // Reduced top margin for small screens
    gap: 8, // Smaller gap between buttons
  },
  backButton: { backgroundColor: '#8E8E93', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', width: '45%', minHeight: 50 },
  backButtonMobile: { 
    paddingVertical: 10, // Reduced padding for small screens
    paddingHorizontal: 16, // Reduced horizontal padding
    minHeight: 48, // Smaller minimum height but still accessible
  },
  nextButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, width: '45%', minHeight: 50 },
  nextButtonMobile: { 
    paddingVertical: 10, // Reduced padding for small screens
    paddingHorizontal: 16, // Reduced horizontal padding
    minHeight: 48, // Smaller minimum height but still accessible
    gap: 6, // Smaller gap between text and icon
  },
  disabledButton: { backgroundColor: '#C7C7CC' },
  buttonText: { color: '#f8fafc', fontSize: 16, fontWeight: '500', textAlign: 'center' },
});
