import { SyringeSelection } from '../dosing';
import { AmountUnit, calculateDose, parseDoseInput, validateUnitCompatibility, getCompatibleConcentrationUnits } from '../dosing';
import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { FeedbackContextType } from '../../types/feedback';
import { InjectionSite } from '../../types/doseLog';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';
import type { ScanUsage } from './useUsageTracking';
import { useDoseLogging } from './useDoseLogging';
import { useOnboardingSurvey } from './useOnboardingSurvey';
import { usePowerUserPromotion } from './usePowerUserPromotion';
import { useBeforeFirstScanPrompt } from './useBeforeFirstScanPrompt';
import { useEvaluationDataCapture } from './useEvaluationDataCapture';

// Import the minimum dose constant for safety checks
const MIN_DOSES_FOR_PROMOTION = 4;

type ScreenStep = 'intro' | 'beforeFirstScan' | 'scan' | 'manualEntry' | 'injectionSiteSelection' | 'postDoseFeedback';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'preDoseConfirmation' | 'finalResult';

type Syringe = SyringeSelection;
type ResetFullFormFunc = (startStep?: ManualStep) => void;

/** Inputs used by the dose calculator flow. */
export interface UseDoseCalculatorProps {
  /** Check scan access and optionally receive the verified usage. */
  checkUsageLimit: (onVerifiedUsage?: (usage: ScanUsage) => void) => Promise<boolean>;
  /** Record an interaction when tracking is available. */
  trackInteraction?: () => void;
}

const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

/** Manages the complete manual-entry and photo-scan dose calculation workflow. */
export default function useDoseCalculator({ checkUsageLimit, trackInteraction }: UseDoseCalculatorProps) {
  const isInitialized = useRef(false);
  const lastActionTimestamp = useRef(Date.now());

  const [screenStep, setScreenStep] = useState<ScreenStep>('intro');
  const [manualStep, setManualStep] = useState<ManualStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'units' | 'mL'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<'concentration' | 'totalAmount' | null>(null);
  const medicationInputTypeRef = useRef(medicationInputType);
  useEffect(() => { medicationInputTypeRef.current = medicationInputType; }, [medicationInputType]);
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
  // A dose choice must never inherit an incompatible concentration default.
  // Preserve compatible mass conversions, including mcg doses in mg/ml.
  useEffect(() => {
    setConcentrationUnit(current => validateUnitCompatibility(unit, current).isValid
      ? current
      : unit === 'units' ? 'units/ml' : unit === 'mcg' ? 'mcg/ml' : 'mg/ml');
  }, [unit]);
  const [totalAmountUnit, setTotalAmountUnit] = useState<AmountUnit | null>('mg');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('');
  const [manualSyringe, setManualSyringe] = useState<SyringeSelection>({ type: 'Standard', volume: '3 ml' });
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentrationExact, setConcentrationExact] = useState<string | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [calculatedConcentration, setCalculatedConcentration] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [needsConcentrationUnit, setNeedsConcentrationUnit] = useState(false);
  const [calculationError, updateCalculationError] = useState<string | null>(null);
  const setCalculationError = useCallback((error: string | null) => {
    if (error) logAnalyticsEvent(ANALYTICS_EVENTS.SAFETY_REFUSAL, { stage: 'calculation', reason: error });
    updateCalculationError(error);
  }, []);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web') setFormError(null);
  }, [medicationInputType, concentrationAmount, concentrationUnit, needsConcentrationUnit, totalAmount, totalAmountUnit, solutionVolume]);

  const [showVolumeErrorModal, setShowVolumeErrorModal] = useState<boolean>(false);
  const [volumeErrorValue, setVolumeErrorValue] = useState<number | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);
  const [stateHealth, setStateHealth] = useState<'healthy' | 'recovering'>('healthy');
  const [feedbackContext, setFeedbackContext] = useState<FeedbackContextType | null>(null);
  const [selectedInjectionSite, setSelectedInjectionSite] = useState<InjectionSite | null>(null);
  const [lastActionType, setLastActionType] = useState<'manual' | 'scan' | null>(null);

  // Bind approval to the exact inputs that produced the pending result.
  const inputKey = JSON.stringify([dose, unit, medicationInputType, concentrationAmount, concentrationUnit,
    totalAmount, totalAmountUnit, solutionVolume, manualSyringe, concentrationExact]);
  const pendingInputs = useRef<string | null>(null);
  const scannedFields = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (!scannedFields.current) return;
    const scanFields = { substanceName, concentrationAmount, concentrationUnit, totalAmount, totalAmountUnit: totalAmountUnit || '',
      manualSyringe: JSON.stringify(manualSyringe) };
    for (const [field, value] of Object.entries(scanFields)) {
      if (field in scannedFields.current && scannedFields.current[field] !== value) {
        logAnalyticsEvent(ANALYTICS_EVENTS.SCANNED_VALUE_EDIT, { field });
        scannedFields.current[field] = value;
      }
    }
  }, [substanceName, concentrationAmount, concentrationUnit, totalAmount, totalAmountUnit, manualSyringe]);


  // Initialize dose logging hook
  const { logDose, logUsageData } = useDoseLogging();
  
  const onboardingSurvey = useOnboardingSurvey();
  const { offerSurvey } = onboardingSurvey;
  const onDoseSaved = useCallback((localDoseCount?: number) => {
    void offerSurvey(localDoseCount, lastActionType === 'scan' ? 'scan' : 'manual');
  }, [offerSurvey, lastActionType]);

  // Initialize power user promotion tracking
  const powerUserPromotion = usePowerUserPromotion();

  // Initialize before first scan prompt tracking
  const beforeFirstScanPrompt = useBeforeFirstScanPrompt();

  // Initialize evaluation data capture
  const evaluationDataCapture = useEvaluationDataCapture();

  // Log limit modal state (now used for both power user promotion and log limits)
  const [showLogLimitModal, setShowLogLimitModal] = useState<boolean>(false);
  const [logLimitModalTriggerReason, setLogLimitModalTriggerReason] = useState<'log_limit' | 'power_user_promotion'>('log_limit');

  // Validate dose input
  const validateDoseInput = useCallback((doseValue: string, _doseUnit: 'mg' | 'mcg' | 'units' | 'mL'): boolean => {
    const numericDose = parseDoseInput(doseValue);
    if (!doseValue.trim() || !(numericDose > 0)) {
      setFormError(doseValue.trim() ? 'Please enter a valid dose amount greater than 0' : 'Please enter a dose amount');
      return false;
    }
    
    setFormError(null);
    return true;
  }, []);

  // Validate concentration input
  const validateConcentrationInput = useCallback((amount: string, concUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'): boolean => {
    const numericAmount = parseDoseInput(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Please enter a valid concentration amount greater than 0');
      return false;
    }
    
    if (unit && concUnit) {
      const compatibility = validateUnitCompatibility(unit, concUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units');
        return false;
      }
    }
    
    setFormError(null);
    return true;
  }, [unit]);

  const resetFullForm = useCallback((startStep: ManualStep = 'dose') => {
    scannedFields.current = null;
    pendingInputs.current = null;
    lastActionTimestamp.current = Date.now();

    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('totalAmount');
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
    setNeedsConcentrationUnit(false);
    setTotalAmount('');
    setTotalAmountUnit('mg');
    setSolutionVolume('');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setDoseValue(null);
    setConcentration(null);
    setConcentrationExact(null);
    setCalculatedVolume(null);
    setCalculatedConcentration(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setGuidance(null);
    setFormError(null);
    // Reset new state variables
    setShowVolumeErrorModal(false);
    setVolumeErrorValue(null);
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setSyringeHint(null);
    setManualStep(startStep);
    setStateHealth('healthy');

    if (!isInitialized.current) {
      isInitialized.current = true;
    }
  }, []);

  const safeSetScreenStep = useCallback((step: ScreenStep) => {
    try {
      lastActionTimestamp.current = Date.now();
      
      // If we're navigating to a new screen, ensure we're properly initialized
      if ((step === 'scan' || step === 'manualEntry') && !isInitialized.current) {
        isInitialized.current = true;
      }
      
      // Store previous step to detect potential navigation loops
      const prevStep = screenStep;
      
      // Track last action type when transitioning from intro to action screens
      if (prevStep === 'intro' && step === 'manualEntry') {
        setLastActionType('manual');
      } else if (prevStep === 'intro' && step === 'scan') {
        setLastActionType('scan');
      }
      
      // Actually update the screen step
      setScreenStep(step);
      
      // Add loop detection - if we're constantly toggling between screens
      if (prevStep !== 'intro' && step === 'intro' && lastActionTimestamp.current - Date.now() < 300) {
        console.warn('[useDoseCalculator] Detected potential navigation loop, stabilizing');
        // Don't do any resets here, just keep the new step
      }
    } catch (error) {
      console.error('[useDoseCalculator] Error in safeSetScreenStep:', error);
      resetFullForm();
      setScreenStep('intro');
      setStateHealth('recovering');
    }
  }, [resetFullForm, screenStep]);

  // Only initialize once on very first mount
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('[useDoseCalculator] ⚠️ FIRST TIME INITIALIZATION: Setting up hook');
      isInitialized.current = true;
      setScreenStep('intro');
      // Don't reset form here - keep the initial state values
    } else {
      console.log('[useDoseCalculator] ✅ Already initialized, skipping setup');
    }
  }, []); // Empty dependency array to run only once

  const handleNextDose = useCallback(() => {
    try {
      if (!dose.trim()) {
        setFormError('Please enter a dose amount');
        return;
      }

      const numericDose = parseDoseInput(dose);
      if (isNaN(numericDose) || numericDose <= 0) {
        setFormError('Please enter a valid dose amount greater than 0');
        return;
      }

      if (!unit) {
        setFormError('Please select a dose unit');
        return;
      }

      setDoseValue(numericDose);
      // Always re-choose the vial-label type for this dose so a stale totalAmount default cannot skip concentration.
      setMedicationInputType(null);
      setManualStep('medicationSource');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextDose:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [dose, unit, medicationInputType]);

  const handleNextMedicationSource = useCallback(() => {
    const selected = medicationInputTypeRef.current;
    if (selected === 'totalAmount') {
      setManualStep('totalAmountInput');
    } else if (selected === 'concentration') {
      setManualStep('concentrationInput');
    } else {
      setFormError('Please select how the medication amount is specified on the vial label');
      return;
    }
    setFormError(null);
  }, []);

  const handleNextConcentrationInput = useCallback(() => {
    try {
      if (!concentrationAmount.trim()) {
        setFormError('Please enter a concentration amount');
        return;
      }

      const numericConcentration = parseDoseInput(concentrationAmount);
      if (isNaN(numericConcentration) || numericConcentration <= 0) {
        setFormError('Please enter a valid concentration amount greater than 0');
        return;
      }
      
      if (!concentrationUnit || needsConcentrationUnit) {
        setFormError('Please select a concentration unit');
        return;
      }

      // Check compatibility with dose unit
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units. Please select a different concentration unit.');
        return;
      }

      setConcentration(numericConcentration);
      
      // If total amount is already set (e.g., from reconstitution planner), skip total amount input
      if (totalAmountUnit && parseDoseInput(totalAmount) > 0 && totalAmountHint?.includes('reconstitution planner')) {
        console.log('[useDoseCalculator] Total amount already prefilled, skipping to syringe');
        setManualStep('syringe');
      } else {
        setManualStep('totalAmountInput');
      }
      
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextConcentrationInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [concentrationAmount, concentrationUnit, needsConcentrationUnit, unit, totalAmount, totalAmountUnit, totalAmountHint]);

  const handleNextTotalAmountInput = useCallback(() => {
    try {
      if (!totalAmount.trim()) {
        setFormError('Please enter the total amount in the vial');
        return;
      }

      if (!(parseDoseInput(totalAmount) > 0)) {
        setFormError('Please enter a valid total amount greater than 0');
        return;
      }

      if (!totalAmountUnit) { setFormError('Needs input: select the total amount unit.'); return; }

      // Check if solution volume is already prefilled (e.g., from reconstitution planner)
      if (medicationInputType === 'totalAmount') {
        if (parseDoseInput(solutionVolume) > 0) {
          console.log('[useDoseCalculator] Solution volume already prefilled, skipping reconstitution step');
          setManualStep('syringe');
        } else {
          setManualStep('reconstitution');
          console.log('[useDoseCalculator] Total amount mode: Going to reconstitution step to capture solution volume');
        }
      } else {
        setManualStep('syringe');
      }
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextTotalAmountInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [totalAmount, totalAmountUnit, medicationInputType, solutionVolume]);

  const handleNextReconstitution = useCallback(() => {
    try {
      if (!solutionVolume.trim()) {
        setFormError('Please enter the solution volume in mL');
        return;
      }

      const numericSolutionVolume = parseDoseInput(solutionVolume);
      if (isNaN(numericSolutionVolume) || numericSolutionVolume <= 0) {
        setFormError('Please enter a valid solution volume greater than 0');
        return;
      }

      setManualStep('syringe');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextReconstitution:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [solutionVolume]);

  const handleCalculateFinal = useCallback(() => {
    try {
      console.log('[useDoseCalculator] handleCalculateFinal called');
      pendingInputs.current = inputKey;
      setDoseValue(parseDoseInput(dose));
      setGuidance(null);
      setCalculatedVolume(null);
      setCalculatedConcentration(null);
      setRecommendedMarking(null);
      if (needsConcentrationUnit && medicationInputType === 'concentration') {
        setCalculationError('Needs input: select the concentration unit.');
        setManualStep('preDoseConfirmation');
        return;
      }
      
      // Validate required inputs before calculation
      if (!Number.isFinite(parseDoseInput(dose)) || parseDoseInput(dose) <= 0) {
        setCalculationError('Invalid dose value. Please go back and enter a valid dose.');
        setManualStep('preDoseConfirmation');
        return;
      }

      if (!manualSyringe || !manualSyringe.volume) {
        setCalculationError('Invalid syringe selection. Please go back and select a valid syringe.');
        setManualStep('preDoseConfirmation');
        return;
      }

      // For concentration and totalAmount, their necessity depends on input mode
      if (unit !== 'mL') { // mL as dose unit doesn't require concentration
        if ((!Number.isFinite(parseDoseInput(concentrationAmount)) || parseDoseInput(concentrationAmount) <= 0) && medicationInputType !== 'totalAmount') {
          setCalculationError('Invalid concentration. Please go back and enter a valid concentration.');
          setManualStep('preDoseConfirmation');
          return;
        }
      }

      // Ensure unit compatibility
      if (unit !== 'mL') { // Skip for mL as dose unit
        const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
        if (!unitCompatibility.isValid) {
          setCalculationError(unitCompatibility.errorMessage || 'Unit mismatch between dose and concentration.');
          setManualStep('preDoseConfirmation');
          return;
        }
      }

      // Prepare total amount value - it should be in the same unit as the concentration unit
      let totalAmountValue = totalAmount ? parseDoseInput(totalAmount) : null;

      // Use the manualSyringe object directly, as it's already in the correct format
      const syringeObj = manualSyringe;

      const result = calculateDose({
        doseValue: parseDoseInput(dose),
        concentration: medicationInputType === 'totalAmount' ? null : parseDoseInput(concentrationAmount),
        concentrationExact,
        unit,
        concentrationUnit,
        totalAmount: totalAmountValue,
        totalAmountUnit,
        manualSyringe: syringeObj,
        solutionVolume, // Add solutionVolume for concentration calculation
      });

      setGuidance(result.guidance || null);
      console.log('[useDoseCalculator] Calculation result:', {
        calculatedVolume: result.calculatedVolume,
        recommendedMarking: result.recommendedMarking,
        calculatedConcentration: result.calculatedConcentration,
        calculationError: result.calculationError
      });

      if (result.calculationError && result.calculationError.startsWith("VOLUME_THRESHOLD_ERROR:")) {
        setShowVolumeErrorModal(true);
        setVolumeErrorValue(result.calculatedVolume);
        setCalculationError(result.calculationError); // Keep blocking state after the modal closes
        // Still set other results so they are available if modal is cancelled
        setCalculatedVolume(result.calculatedVolume);
        setRecommendedMarking(result.recommendedMarking);
        setCalculatedConcentration(result.calculatedConcentration || null);
      } else {
        setCalculatedVolume(result.calculatedVolume);
        setRecommendedMarking(result.recommendedMarking);
        setCalculationError(result.calculationError);
        setCalculatedConcentration(result.calculatedConcentration || null);
      }

      // Always navigate to preDoseConfirmation screen regardless of calculation errors
      setManualStep('preDoseConfirmation');
      console.log('[useDoseCalculator] Set manualStep to preDoseConfirmation');

      // Capture evaluation data for manual entry
      if (evaluationDataCapture && !evaluationDataCapture.isCapturing) {
        const prompt = `Calculate dose: ${doseValue} ${unit} ${substanceName || 'medication'}${concentration ? `, ${concentration} ${concentrationUnit} concentration` : ''}${medicationInputType === 'totalAmount' && totalAmount && solutionVolume ? `, ${totalAmount} ${concentrationUnit.split('/')[0]} in ${solutionVolume} ml solution` : ''}, using ${manualSyringe.type.toLowerCase()} ${manualSyringe.volume} syringe`;
        
        evaluationDataCapture.captureUserInteraction({
          prompt,
          userIntent: 'manual_entry',
          inputParameters: {
            doseValue,
            unit,
            substanceName: substanceName || undefined,
            concentration,
            concentrationUnit,
            syringeType: manualSyringe.type,
            syringeVolume: manualSyringe.volume,
            totalAmount: totalAmountValue || undefined,
            solutionVolume: solutionVolume || undefined,
            medicationInputType: medicationInputType || undefined
          },
          result: {
            calculatedVolume: result.calculatedVolume,
            recommendedMarking: result.recommendedMarking,
            calculationError: result.calculationError,
            calculatedConcentration: result.calculatedConcentration
          }
        }).catch(error => {
          console.error('[useDoseCalculator] Error capturing evaluation data:', error);
        });
      }
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
      // Ensure we still navigate to the confirmation screen even if there's an error
      setManualStep('preDoseConfirmation');
      console.log('[useDoseCalculator] Set manualStep to preDoseConfirmation (after error)');
    }
  }, [inputKey, dose, concentrationAmount, doseValue, concentration, concentrationExact, needsConcentrationUnit, manualSyringe, unit, totalAmount, totalAmountUnit, concentrationUnit, solutionVolume, medicationInputType, substanceName, evaluationDataCapture]);

  useEffect(() => {
    if (pendingInputs.current !== null && pendingInputs.current !== inputKey) {
      pendingInputs.current = null;
      setCalculatedVolume(null);
      setRecommendedMarking(null);
      setGuidance(null);
      if (manualStep === 'preDoseConfirmation' || manualStep === 'finalResult') handleCalculateFinal();
    }
  }, [inputKey, manualStep, handleCalculateFinal]);

  const handleNextPreDoseConfirmation = useCallback(() => {
    try {
      console.log('[useDoseCalculator] handleNextPreDoseConfirmation called');
      if (manualStep !== 'preDoseConfirmation' || pendingInputs.current !== inputKey || calculationError || !recommendedMarking) return;
      setManualStep('finalResult');
      console.log('[useDoseCalculator] Set manualStep to finalResult');
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextPreDoseConfirmation:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [manualStep, inputKey, calculationError, recommendedMarking]);

  const handleCloseVolumeErrorModal = useCallback(() => {
    setShowVolumeErrorModal(false);
    lastActionTimestamp.current = Date.now();
  }, []);

  const handleReEnterVialData = useCallback(() => {
    setShowVolumeErrorModal(false);
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
    setNeedsConcentrationUnit(false); // Or your default
    setTotalAmount('');
    setTotalAmountUnit('mg');
    setSolutionVolume('');
    setConcentration(null);
    setConcentrationExact(null);
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setGuidance(null);
    setFormError(null);
    // also clear doseValue as it might be related to the vial data error
    // setDose(''); // Optional: decide if dose itself should be cleared
    // setDoseValue(null); // Optional
    setManualStep('medicationSource'); // Navigate to medication source selection
    lastActionTimestamp.current = Date.now();
  }, []);

  const handleBack = useCallback(() => {
    try {
      if (manualStep === 'dose') setScreenStep('intro');
      else if (manualStep === 'medicationSource') setManualStep('dose');
      else if (manualStep === 'concentrationInput') setManualStep('medicationSource');
      else if (manualStep === 'totalAmountInput') {
        if (medicationInputType === 'totalAmount') {
          setManualStep('medicationSource');
        } else {
          setManualStep('concentrationInput');
        }
      }
      else if (manualStep === 'reconstitution') setManualStep('totalAmountInput');
      else if (manualStep === 'syringe') {
        setManualStep(medicationInputType === 'totalAmount' ? 'reconstitution' : 'totalAmountInput');
      }
      else if (manualStep === 'preDoseConfirmation') setManualStep('syringe');
      else if (manualStep === 'finalResult') setManualStep('preDoseConfirmation');

      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleBack:', error);
      resetFullForm();
      setScreenStep('intro');
    }
  }, [manualStep, medicationInputType, resetFullForm]);

  const handleStartOver = useCallback(() => {
    resetFullForm('dose');
    setScreenStep('intro');
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm('dose');
  }, [resetFullForm]);

  const handleGoToFeedback = useCallback((nextAction: 'new_dose' | 'scan_again' | 'start_over') => {
    logAnalyticsEvent(ANALYTICS_EVENTS.MANUAL_ENTRY_COMPLETED);
    
    // Track interaction for sign-up prompt
    if (trackInteraction) {
      trackInteraction();
    }
    
    setFeedbackContext({
      nextAction,
      doseInfo: {
        substanceName,
        doseValue,
        unit,
        calculatedVolume,
        syringeType: manualSyringe?.type || null,
        recommendedMarking,
        insulinScale: manualSyringe.insulinScale,
        totalAmountUnit: totalAmountUnit || undefined,
        concentrationExact: concentrationExact || undefined,
        injectionSite: selectedInjectionSite,
        // Add original user inputs for "Use Last Dose" feature
        medicationInputType,
        concentrationAmount,
        concentrationUnit,
        totalAmount,
        solutionVolume,
      },
    });
    
    // Always go to injection site selection first
    setScreenStep('injectionSiteSelection');
  }, [trackInteraction, substanceName, doseValue, unit, calculatedVolume, manualSyringe, recommendedMarking, selectedInjectionSite, medicationInputType, concentrationAmount, concentrationUnit, totalAmount, totalAmountUnit, concentrationExact, solutionVolume]);

  // Handle injection site selection completion
  const handleInjectionSiteSelected = useCallback(() => {
    if (!feedbackContext) return;
    
    // Update feedback context with selected injection site
    setFeedbackContext({
      ...feedbackContext,
      doseInfo: {
        ...feedbackContext.doseInfo,
        injectionSite: selectedInjectionSite,
      },
    });
    
    setScreenStep('postDoseFeedback');
  }, [feedbackContext, selectedInjectionSite]);

  // Handle injection site selection cancellation
  const handleInjectionSiteCancel = useCallback(() => {
    setScreenStep('manualEntry');
    setManualStep('finalResult');
    setFeedbackContext(null);
    setSelectedInjectionSite(null);
  }, []);

  const handleFeedbackComplete = useCallback(async () => {
    console.log('[useDoseCalculator] handleFeedbackComplete called', { feedbackContext });
    if (!feedbackContext) return;
    
    console.log('[useDoseCalculator] === DOSE COMPLETION FLOW DEBUG ===');
    console.log('[useDoseCalculator] Current power user promotion data BEFORE increment:', powerUserPromotion.promotionData);
    
    // Increment dose count for power user promotion tracking
    await powerUserPromotion.incrementDoseCount();
    
    console.log('[useDoseCalculator] Current power user promotion data AFTER increment:', powerUserPromotion.promotionData);
    
    // Automatically log the completed dose
    const logResult = await logDose(feedbackContext.doseInfo);
    if (logResult.success) onDoseSaved(logResult.localDoseCount);
    
    console.log('[useDoseCalculator] Log result:', logResult);
    
    // IMPORTANT: Add a small delay to ensure state updates have propagated
    // This prevents race conditions between incrementDoseCount and shouldShowPromotion
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const shouldShowPowerUserPromotion = powerUserPromotion.shouldShowPromotion();
    console.log('[useDoseCalculator] Should show power user promotion after delay?', shouldShowPowerUserPromotion);
    
    // Track interaction for sign-up prompt if log was successful
    if (logResult.success && trackInteraction) {
      trackInteraction();
    }
    
    // ABSOLUTE SAFETY CHECK: NEVER show log limit modal for users with low usage
    // This completely prevents false positives that frustrate users
    const currentLogUsage = powerUserPromotion.promotionData.doseCount; // Use dose count as proxy for log usage
    const MINIMUM_USAGE_FOR_LIMIT_MODAL = 10; // Require at least 10 completed doses before any limit modal
    
    // HARD BLOCK: Do not show log limit modal for users who haven't established significant usage
    if (logResult.limitReached) {
      if (currentLogUsage < MINIMUM_USAGE_FOR_LIMIT_MODAL) {
        console.log('[useDoseCalculator] 🛡️ ABSOLUTE SAFETY: Blocking log limit modal - insufficient usage:', currentLogUsage, '< minimum:', MINIMUM_USAGE_FOR_LIMIT_MODAL);
        // Completely skip modal and continue with normal flow
      } else {
        console.log('[useDoseCalculator] ❌ Log limit reached with sufficient usage, showing LOG LIMIT modal');
        setLogLimitModalTriggerReason('log_limit');
        setShowLogLimitModal(true);
        return; // Stop here, don't proceed with navigation
      }
    }

    if (shouldShowPowerUserPromotion) {
      // FINAL SAFETY CHECK: Never show power user promotion if dose count is less than 4
      // This prevents any race conditions or corrupted data from causing issues
      const currentDoseCount = powerUserPromotion.promotionData.doseCount;
      if (currentDoseCount < MIN_DOSES_FOR_PROMOTION) {
        console.log('[useDoseCalculator] 🛡️ SAFETY CHECK: Preventing power user promotion with insufficient doses:', currentDoseCount, 'minimum:', MIN_DOSES_FOR_PROMOTION);
        // Don't show modal, just continue with normal flow
      } else {
        console.log('[useDoseCalculator] ✅ Power user promotion criteria met, showing POWER USER PROMOTION modal');
        await powerUserPromotion.markPromotionShown();
        setLogLimitModalTriggerReason('power_user_promotion');
        setShowLogLimitModal(true);
        return; // Stop here, don't proceed with navigation
      }
    }
    
    if (logResult.success) {
      console.log('[useDoseCalculator] Dose automatically logged');
    } else {
      console.warn('[useDoseCalculator] Failed to log dose, but continuing...');
    }
    
    const nextAction = feedbackContext.nextAction;
    console.log('[useDoseCalculator] Next action:', nextAction);
    
    // Clear feedback context
    setFeedbackContext(null);
    
    // Navigate to the intended destination
    if (nextAction === 'start_over') {
      console.log('[useDoseCalculator] Start over - navigating to intro and clearing state');
      resetFullForm('dose');
      setLastActionType(null); // Clear the last action type
      setScreenStep('intro');
    } else if (nextAction === 'new_dose') {
      console.log('[useDoseCalculator] New dose - repeating last action type:', lastActionType);
      // Reset form but preserve the last action type for tracking
      resetFullForm('dose');
      
      if (lastActionType === 'scan') {
        // Check scan limits before allowing scan again
        const canProceed = await checkUsageLimit();
        if (canProceed) {
          console.log('[useDoseCalculator] ✅ Repeating scan action');
          // Add a small delay to ensure state is clean before navigation
          setTimeout(() => {
            setScreenStep('scan');
          }, 100);
        } else {
          // If no scans remaining, go back to intro screen
          console.log('[useDoseCalculator] ❌ Scan limit reached, going to intro');
          setScreenStep('intro');
        }
      } else if (lastActionType === 'manual') {
        console.log('[useDoseCalculator] ✅ Repeating manual entry action');
        setScreenStep('manualEntry');
      } else {
        // Fallback to intro if no last action type is set
        console.log('[useDoseCalculator] No last action type set, defaulting to intro');
        setScreenStep('intro');
      }
    } else if (nextAction === 'scan_again') {
      console.log('[useDoseCalculator] Scan again requested (legacy action)');
      // This maintains backward compatibility but shouldn't be used in the new UI
      const canProceed = await checkUsageLimit();
      if (canProceed) {
        console.log('[useDoseCalculator] ✅ Navigating to scan screen with camera reset flag');
        setTimeout(() => {
          setScreenStep('scan');
        }, 100);
      } else {
        console.log('[useDoseCalculator] ❌ Scan limit reached, going to intro');
        setScreenStep('intro');
      }
    } else {
      console.log('[useDoseCalculator] ⚠️ Unknown next action:', nextAction);
    }
    
    lastActionTimestamp.current = Date.now();
  }, [feedbackContext, resetFullForm, checkUsageLimit, logDose, onDoseSaved, lastActionType, trackInteraction, powerUserPromotion]);

  // Handle scan navigation with before first scan prompt check
  const handleScanNavigation = useCallback(async () => {
    console.log('[useDoseCalculator] Checking if before first scan prompt should be shown');
    
    if (beforeFirstScanPrompt.shouldShowPrompt()) {
      console.log('[useDoseCalculator] Showing before first scan prompt');
      setScreenStep('beforeFirstScan');
    } else {
      console.log('[useDoseCalculator] Going directly to scan');
      setScreenStep('scan');
    }
  }, [beforeFirstScanPrompt]);

  // Handle before first scan prompt continue
  const handleBeforeFirstScanContinue = useCallback(async () => {
    console.log('[useDoseCalculator] Before first scan continue pressed');
    
    // Mark prompt as shown and continue to scan
    await beforeFirstScanPrompt.markPromptAsShown();
    
    // Log analytics event
    logAnalyticsEvent(ANALYTICS_EVENTS.BEFORE_FIRST_SCAN_CONTINUE, {
      showCount: beforeFirstScanPrompt.showCount + 1,
    });
    
    setScreenStep('scan');
  }, [beforeFirstScanPrompt]);

  // Handle before first scan "don't show again"
  const handleBeforeFirstScanDontShowAgain = useCallback(async () => {
    console.log('[useDoseCalculator] Before first scan dont show again pressed');
    
    // Mark as don't show again and continue to scan
    await beforeFirstScanPrompt.markDontShowAgain();
    await beforeFirstScanPrompt.markPromptAsShown();
    
    setScreenStep('scan');
  }, [beforeFirstScanPrompt]);

  // Handle before first scan back
  const handleBeforeFirstScanBack = useCallback(() => {
    console.log('[useDoseCalculator] Before first scan back pressed');
    setScreenStep('intro');
  }, []);

  const handleCapture = useCallback(async (onVerifiedUsage?: (usage: ScanUsage) => void) => {
    try {
      const canProceed = await checkUsageLimit(onVerifiedUsage);
      if (!canProceed) return false;
      setManualStep('dose');
      lastActionTimestamp.current = Date.now();
      return true;
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCapture:', error);
      return false;
    }
  }, [checkUsageLimit]);

  useEffect(() => {
    const checkStateHealth = () => {
      const now = Date.now();
      if (now - lastActionTimestamp.current > 10 * 60 * 1000) {
        console.log('[useDoseCalculator] Detected stale state, resetting');
        resetFullForm();
        setScreenStep('intro');
        setStateHealth('recovering');
      }
    };
    const intervalId = setInterval(checkStateHealth, 60000);
    return () => clearInterval(intervalId);
  }, [resetFullForm]);

  // The useEffect below was causing a navigation loop and has been removed
  // When users clicked "Scan" or "Enter Manually" from the intro screen,
  // it was incorrectly resetting the form and sending users back to intro
  // useEffect(() => {
  //   console.log('[useDoseCalculator] screenStep/manualStep changed:', { screenStep, manualStep });
  //   if (screenStep === 'intro' && manualStep !== 'dose') {
  //     console.log('[useDoseCalculator] Resetting form due to intro screen with non-dose manual step');
  //     resetFullForm();
  //   }
  // }, [screenStep, manualStep, resetFullForm]);

  // Handle log limit modal actions
  const handleCloseLogLimitModal = useCallback(() => {
    setShowLogLimitModal(false);
    
    // If this was a power user promotion modal, continue with navigation
    if (logLimitModalTriggerReason === 'power_user_promotion' && feedbackContext) {
      const nextAction = feedbackContext.nextAction;
      setFeedbackContext(null);
      
      // Navigate based on the next action, similar to handleFeedbackComplete
      if (nextAction === 'start_over') {
        resetFullForm('dose');
        setLastActionType(null);
        setScreenStep('intro');
      } else if (nextAction === 'new_dose') {
        resetFullForm('dose');
        if (lastActionType === 'scan') {
          setScreenStep('scan');
        } else if (lastActionType === 'manual') {
          setScreenStep('manualEntry');
        } else {
          setScreenStep('intro');
        }
      } else {
        setScreenStep('intro');
      }
    }
  }, [logLimitModalTriggerReason, feedbackContext, resetFullForm, lastActionType]);

  const handleContinueWithoutSaving = useCallback(() => {
    console.log('[useDoseCalculator] User chose to continue without saving dose');
    // Clear feedback context and proceed with navigation without logging
    if (feedbackContext) {
      const nextAction = feedbackContext.nextAction;
      setFeedbackContext(null);
      
      // Navigate based on the next action, just like in handleFeedbackComplete
      if (nextAction === 'start_over') {
        resetFullForm('dose');
        setLastActionType(null);
        setScreenStep('intro');
      } else if (nextAction === 'new_dose') {
        resetFullForm('dose');
        if (lastActionType === 'scan') {
          setScreenStep('scan');
        } else if (lastActionType === 'manual') {
          setScreenStep('manualEntry');
        } else {
          setScreenStep('intro');
        }
      } else {
        setScreenStep('intro');
      }
    }
    setShowLogLimitModal(false);
  }, [feedbackContext, lastActionType, resetFullForm]);

  // // Alternative implementation - reset to initial screen without navigation
  // // Uncomment if the above navigation logic causes issues
  // const handleContinueWithoutSaving = useCallback(() => {
  //   console.log('[useDoseCalculator] User chose to continue without saving dose');
  //   setFeedbackContext(null);
  //   setShowLogLimitModal(false);
  //   resetFullForm('dose');
  //   setScreenStep('intro');
  // }, [resetFullForm]);

  return {
    registerScannedFields: (fields: Record<string, string>) => { scannedFields.current = fields; },
    screenStep,
    setScreenStep: safeSetScreenStep,
    manualStep,
    setManualStep,
    dose,
    setDose,
    unit,
    setUnit,
    substanceName,
    setSubstanceName,
    medicationInputType,
    setMedicationInputType,
    concentrationAmount,
    setConcentrationAmount: (value: string) => { setConcentrationAmount(value); setConcentrationExact(null); },
    concentrationUnit,
    setConcentrationUnit: (value: typeof concentrationUnit) => { setConcentrationUnit(value); setConcentrationExact(null); setNeedsConcentrationUnit(false); },
    setNeedsConcentrationUnit,
    totalAmount,
    setTotalAmount: (value: string) => { setTotalAmount(value); setConcentrationExact(null); },
    totalAmountUnit,
    setTotalAmountUnit: (value: AmountUnit | null) => { setTotalAmountUnit(value); setConcentrationExact(null); },
    solutionVolume,
    setSolutionVolume: (value: string) => { setSolutionVolume(value); setConcentrationExact(null); },
    manualSyringe,
    setManualSyringe: (syringe: SyringeSelection | string) => {
      try {
        if (typeof syringe === 'string') {
          // Parse string format (for backward compatibility)
          if (syringe.includes('Insulin')) {
            setManualSyringe({ type: 'Insulin', volume: syringe.replace('Insulin ', '') });
          } else {
            setManualSyringe({ type: 'Standard', volume: syringe });
          }
        } else {
          // Object format
          setManualSyringe(syringe);
        }
        lastActionTimestamp.current = Date.now();
      } catch (error) {
        console.error('[useDoseCalculator] Error in setManualSyringe:', error);
        setManualSyringe({ type: 'Standard', volume: '', needsConfirmation: true });
      }
    },
    doseValue,
    setDoseValue,
    concentration,
    setConcentration,
    setConcentrationExact,
    calculatedVolume,
    setCalculatedVolume,
    calculatedConcentration,
    setCalculatedConcentration,
    recommendedMarking,
    setRecommendedMarking,
    guidance,
    setGuidance,
    calculationError,
    setCalculationError,
    formError,
    setFormError,
    substanceNameHint,
    setSubstanceNameHint,
    concentrationHint,
    setConcentrationHint,
    totalAmountHint,
    setTotalAmountHint,
    syringeHint,
    setSyringeHint,
    resetFullForm,
    handleNextDose,
    handleNextMedicationSource,
    handleNextConcentrationInput,
    handleNextTotalAmountInput,
    handleNextReconstitution,
    handleCalculateFinal,
    handleNextPreDoseConfirmation,
    handleBack,
    handleStartOver,
    handleGoHome,
    handleCapture,
    stateHealth,
    validateDoseInput,
    validateConcentrationInput,
    // Last action tracking
    lastActionType,
    // New state and handlers
    showVolumeErrorModal,
    setShowVolumeErrorModal,
    volumeErrorValue,
    setVolumeErrorValue,
    handleCloseVolumeErrorModal,
    handleReEnterVialData,
    // Feedback context
    feedbackContext,
    setFeedbackContext,
    handleGoToFeedback,
    handleFeedbackComplete,
    // Before First Scan handlers
    handleScanNavigation,
    handleBeforeFirstScanContinue,
    handleBeforeFirstScanDontShowAgain,
    handleBeforeFirstScanBack,
    beforeFirstScanPrompt,
    // Log limit modal
    showLogLimitModal,
    logLimitModalTriggerReason,
    handleCloseLogLimitModal,
    handleContinueWithoutSaving,
    logUsageData,
    onboardingSurvey,
    onDoseSaved,
    // Injection site selection
    selectedInjectionSite,
    setSelectedInjectionSite,
    handleInjectionSiteSelected,
    handleInjectionSiteCancel,
  };
}
