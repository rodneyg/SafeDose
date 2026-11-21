import { getManualProgress } from '../lib/manualProgress';
import { SyringeSelection } from '../lib/dosing';
import { AmountUnit, formatDoseNumber, parseDoseInput, validateUnitCompatibility } from '../lib/dosing';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
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
  const isDoseStepValid = (): boolean => {
    return parseDoseInput(dose) > 0;
  };

  const isMedicationSourceStepValid = (): boolean => {
    return Boolean(medicationInputType === 'concentration' || medicationInputType === 'totalAmount');
  };

  const getConcentrationInputError = (): string | null => {
    if (!(parseDoseInput(concentrationAmount) > 0)) {
      return 'Enter a concentration greater than zero.';
    }
    if (unit && concentrationUnit) {
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      if (!compatibility.isValid) {
        return compatibility.errorMessage;
      }
    }
    return null;
  };

  const isTotalAmountInputStepValid = (): boolean => {
    const isValid = parseDoseInput(totalAmount) > 0;
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
      case 'concentrationInput': result = getConcentrationInputError() === null; break;
      case 'totalAmountInput': result = isTotalAmountInputStepValid(); break;
      case 'reconstitution': result = isReconstitutionStepValid(); break;
      case 'syringe': result = isSyringeStepValid(); break;
      case 'preDoseConfirmation': result = isPreDoseConfirmationStepValid(); break;
      default: result = false;
    }
    console.log(`[ValidationCheck] step=${manualStep}, isValid=${result}`);
    return result;
  };

  const isWeb = Platform.OS === 'web';
  const isReviewStep = manualStep === 'preDoseConfirmation';
  // Web input steps report their errors on submit. Syringe and review still
  // require a valid selection or result before their actions can run.
  const canSubmit = (isWeb && !isReviewStep && manualStep !== 'syringe' && manualStep !== 'finalResult') || isCurrentStepValid();
  const nextActions = {
    dose: handleNextDose,
    medicationSource: handleNextMedicationSource,
    concentrationInput: handleNextConcentrationInput,
    totalAmountInput: handleNextTotalAmountInput,
    reconstitution: handleNextReconstitution,
    syringe: handleCalculateFinal,
    preDoseConfirmation: handleNextPreDoseConfirmation,
    finalResult: undefined,
  };
  const handleNextButtonPress = () => {
    if (canSubmit) nextActions[manualStep]?.();
  };

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
          formError={isWeb ? null : formError}
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
          formError={isWeb ? null : formError}
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

  const getNativeInputError = (): string | null => {
    switch (manualStep) {
      case 'dose':
        return isDoseStepValid() ? null : 'Enter a dose greater than zero.';
      case 'concentrationInput':
        return getConcentrationInputError();
      case 'totalAmountInput':
        return isTotalAmountInputStepValid() ? null : 'Enter a total amount greater than zero.';
      default:
        return null;
    }
  };

  const nativeInputError = !isWeb && !formError ? getNativeInputError() : null;
  const visibleError = isWeb && manualStep === 'syringe' && !canSubmit
    ? 'Select a syringe size to calculate.'
    : formError ?? nativeInputError;
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
          !canSubmit && styles.disabledButton,
          isMobileWeb && styles.nextButtonMobile
        ]}
        onPress={handleNextButtonPress}
        disabled={!canSubmit}
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
          {visibleError && (
            <Text accessibilityRole={isWeb || nativeInputError ? 'alert' : undefined} style={[styles.errorText, isWeb && styles.webErrorText]}>
              {visibleError}
            </Text>
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
  webErrorText: { color: '#991b1b', backgroundColor: '#fee2e2' },
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
