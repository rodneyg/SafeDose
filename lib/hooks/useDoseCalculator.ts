import { useState, useCallback, useRef, useEffect } from 'react';
import { validateUnitCompatibility, getCompatibleConcentrationUnits } from '../doseUtils'; // Core calculation utilities
import { FeedbackContextType } from '../../types/feedback';
import { InjectionSite } from '../../types/doseLog';
import { logAnalyticsEvent, ANALYTICS_EVENTS } from '../analytics';
import { useDoseLogging } from './useDoseLogging'; // Hook for logging doses
import { useWhyAreYouHereTracking } from './useWhyAreYouHereTracking'; // Hook for "Why are you here?" survey
import { usePMFSurvey } from './usePMFSurvey'; // Hook for Product-Market Fit survey
import { usePowerUserPromotion } from './usePowerUserPromotion'; // Hook for tracking usage for power user promotions

/**
 * @file useDoseCalculator.ts
 * @description This custom React hook manages the entire state and logic for the multi-step
 * dose calculation process within the application. It handles user inputs, navigation between
 * different steps (e.g., dose entry, concentration, syringe selection), performs calculations
 * by invoking utility functions from `lib/doseUtils.ts`, and manages feedback/survey flows.
 *
 * It integrates with other hooks for functionalities like dose logging (`useDoseLogging`),
 * user engagement surveys (`useWhyAreYouHereTracking`, `usePMFSurvey`), and power user
 * feature promotions (`usePowerUserPromotion`).
 */

// Import the minimum dose constant for safety checks
const MIN_DOSES_FOR_PROMOTION = 4; // Minimum doses logged before a power user promotion can be shown.

// Defines the possible main screens in the dose calculation flow.
type ScreenStep = 'intro' | 'scan' | 'manualEntry' | 'whyAreYouHere' | 'injectionSiteSelection' | 'postDoseFeedback' | 'pmfSurvey';
// Defines the sub-steps within the manual entry part of the dose calculation.
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'preDoseConfirmation' | 'finalResult';

type Syringe = { type: 'Insulin' | 'Standard'; volume: string };
type ResetFullFormFunc = (startStep?: ManualStep) => void; // Type for the form reset function.

interface UseDoseCalculatorProps {
  /** Function to check if the user has reached a usage limit (e.g., for scanning). */
  checkUsageLimit: () => Promise<boolean>;
  /** Optional function to track user interactions, often used for analytics or triggering prompts. */
  trackInteraction?: () => void;
}

// Utility function to check if a value is valid (not null, undefined, or an empty string).
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

/**
 * Custom hook to manage the state and logic of the dose calculation feature.
 *
 * @param {UseDoseCalculatorProps} props - Properties for the hook.
 *   @param {() => Promise<boolean>} props.checkUsageLimit - Function to verify if usage limits (e.g., scan limits) have been reached.
 *   @param {() => void} [props.trackInteraction] - Optional callback to track user interactions, potentially for analytics or conditional UI changes (e.g., sign-up prompts).
 *
 * @returns An object containing various state variables and handler functions to manage the dose calculation UI. This includes:
 *   - `screenStep`, `manualStep`: Current navigation state.
 *   - State for all user inputs: `dose`, `unit`, `substanceName`, `concentrationAmount`, `totalAmount`, `solutionVolume`, `manualSyringe`, etc.
 *   - Calculated results: `calculatedVolume`, `recommendedMarking`, `calculatedConcentration`, `calculationError`.
 *   - Error states: `formError`, `showVolumeErrorModal`.
 *   - Hint states for input fields: `substanceNameHint`, `concentrationHint`, etc.
 *   - Handler functions for navigating (`handleNext...`, `handleBack`), calculations (`handleCalculateFinal`), form management (`resetFullForm`, `handleStartOver`),
 *     and feedback/survey flows (`handleGoToFeedback`, `handleFeedbackComplete`, `handlePMFSurveyComplete`, etc.).
 *   - Interaction with `doseUtils.ts`: Uses `validateUnitCompatibility` for input validation and `calculateDose` (dynamically imported) for the core dose calculation.
 *   - Integration with other hooks: `useDoseLogging` for saving doses, `useWhyAreYouHereTracking` and `usePMFSurvey` for user feedback,
 *     and `usePowerUserPromotion` for managing eligibility for special features.
 */
export default function useDoseCalculator({ checkUsageLimit, trackInteraction }: UseDoseCalculatorProps) {
  const isInitialized = useRef(false); // Tracks if the hook has been initialized to prevent premature resets.
  const lastActionTimestamp = useRef(Date.now()); // Timestamp of the last user action, used for detecting stale state.

  // State for navigation
  const [screenStep, setScreenStep] = useState<ScreenStep>('intro'); // Current main screen (e.g., 'intro', 'manualEntry').
  const [manualStep, setManualStep] = useState<ManualStep>('dose'); // Current step within manual entry.
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'units' | 'mL'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<'concentration' | 'totalAmount' | null>('totalAmount');
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('');
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' });
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [calculatedConcentration, setCalculatedConcentration] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null); // Error messages specific to form validation.
  const [showVolumeErrorModal, setShowVolumeErrorModal] = useState<boolean>(false); // Controls visibility of the volume error modal.
  const [volumeErrorValue, setVolumeErrorValue] = useState<number | null>(null); // Stores the problematic volume value.
  // Hints for input fields, potentially populated by scanned data or previous entries.
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);
  const [stateHealth, setStateHealth] = useState<'healthy' | 'recovering'>('healthy'); // Tracks the health of the hook's internal state.
  const [feedbackContext, setFeedbackContext] = useState<FeedbackContextType | null>(null); // Context for the post-dose feedback screen.
  const [selectedInjectionSite, setSelectedInjectionSite] = useState<InjectionSite | null>(null); // Stores the selected injection site.
  const [lastActionType, setLastActionType] = useState<'manual' | 'scan' | null>(null); // Tracks if the last primary action was manual entry or scanning.

  // Initialize dose logging hook
  const { logDose, logUsageData } = useDoseLogging();
  
  // Initialize WhyAreYouHere tracking hook
  const whyAreYouHereTracking = useWhyAreYouHereTracking(); // Manages the "Why are you here?" survey.
  const pmfSurvey = usePMFSurvey(); // Manages the Product-Market Fit survey.

  // Initialize power user promotion tracking
  const powerUserPromotion = usePowerUserPromotion(); // Manages eligibility for power user features.

  // State for a generic modal that can be triggered by log limits or power user promotions.
  const [showLogLimitModal, setShowLogLimitModal] = useState<boolean>(false);
  const [logLimitModalTriggerReason, setLogLimitModalTriggerReason] = useState<'log_limit' | 'power_user_promotion'>('log_limit');

  /**
   * Validates the dose input value and unit.
   * Checks for positive numerical value and compatibility with the current concentration unit.
   * Uses `validateUnitCompatibility` from `doseUtils.ts`.
   */
  const validateDoseInput = useCallback((doseValue: string, doseUnit: 'mg' | 'mcg' | 'units' | 'mL'): boolean => {
    const numericDose = parseFloat(doseValue);
    if (!doseValue || isNaN(numericDose) || numericDose <= 0) { // Dose must be a positive number.
      setFormError('Please enter a valid dose amount greater than 0');
      return false;
    }
    
    // Check compatibility if concentration unit is already set.
    if (concentrationUnit && doseUnit) {
      const compatibility = validateUnitCompatibility(doseUnit, concentrationUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units');
        return false;
      }
    }
    
    setFormError(null); // Clear any existing form errors.
    return true;
  }, [concentrationUnit]); // Depends on the current concentration unit.

  /**
   * Validates the concentration input value and unit.
   * Checks for positive numerical value and compatibility with the current dose unit.
   * Uses `validateUnitCompatibility` from `doseUtils.ts`.
   */
  const validateConcentrationInput = useCallback((amount: string, concUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'): boolean => {
    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) { // Concentration must be a positive number.
      setFormError('Please enter a valid concentration amount greater than 0');
      return false;
    }
    
    // Check compatibility if dose unit is already set.
    if (unit && concUnit) {
      const compatibility = validateUnitCompatibility(unit, concUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units');
        return false;
      }
    }
    
    setFormError(null); // Clear any existing form errors.
    return true;
  }, [unit]); // Depends on the current dose unit.

  /**
   * Resets all form fields and state variables to their initial values.
   * Optionally sets the starting manual step.
   * @param {ManualStep} [startStep='dose'] - The manual step to begin at after reset.
   */
  const resetFullForm = useCallback((startStep: ManualStep = 'dose') => {
    lastActionTimestamp.current = Date.now(); // Update last action time.

    // Reset all input states.
    setDose('');
    setUnit('mg'); // Default unit.
    setSubstanceName('');
    setMedicationInputType('totalAmount'); // Default input type.
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml'); // Default concentration unit.
    setTotalAmount('');
    setSolutionVolume('');
    setManualSyringe({ type: 'Standard', volume: '3 ml' }); // Default syringe.
    // Reset calculated values.
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setCalculatedConcentration(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    // Reset modal and hint states.
    setShowVolumeErrorModal(false);
    setVolumeErrorValue(null);
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setSyringeHint(null);
    setManualStep(startStep); // Set the desired starting step for manual entry.
    setStateHealth('healthy'); // Mark state as healthy after reset.

    // Mark as initialized if this is the first reset.
    if (!isInitialized.current) {
      isInitialized.current = true;
    }
  }, []); // No dependencies, this function is stable.

  /**
   * Safely sets the screen step, updating timestamps and handling initialization.
   * Also includes logic to detect and mitigate potential navigation loops.
   * @param {ScreenStep} step - The target screen step.
   */
  const safeSetScreenStep = useCallback((step: ScreenStep) => {
    try {
      lastActionTimestamp.current = Date.now();
      
      // Mark as initialized if navigating to a main action screen for the first time.
      if ((step === 'scan' || step === 'manualEntry') && !isInitialized.current) {
        isInitialized.current = true;
      }
      
      const prevStep = screenStep;
      
      // Determine the type of action (manual or scan) when moving from intro.
      if (prevStep === 'intro' && step === 'manualEntry') {
        setLastActionType('manual');
      } else if (prevStep === 'intro' && step === 'scan') {
        setLastActionType('scan');
      }
      
      setScreenStep(step); // Update the screen step.
      
      // Basic loop detection: if rapidly toggling back to intro, log a warning.
      // This is a simple heuristic and might need refinement for more complex loop scenarios.
      if (prevStep !== 'intro' && step === 'intro' && (Date.now() - lastActionTimestamp.current) < 300) {
        console.warn('[useDoseCalculator] Detected potential navigation loop, stabilizing to intro.');
        // No automatic reset here to avoid disrupting user flow further unless a more robust
        // loop detection and resolution mechanism is in place.
      }
    } catch (error) {
      console.error('[useDoseCalculator] Error in safeSetScreenStep:', error);
      resetFullForm(); // Reset form on error.
      setScreenStep('intro'); // Go back to intro screen.
      setStateHealth('recovering'); // Mark state as recovering.
    }
  }, [resetFullForm, screenStep]); // Depends on current screenStep for loop detection.

  // Effect to initialize the form when the hook mounts for the first time.
  useEffect(() => {
    if (!isInitialized.current) {
      resetFullForm('dose'); // Perform initial reset.
      setScreenStep('intro'); // Ensure it starts on the intro screen.
    }
  }, [resetFullForm]); // Runs once on mount due to resetFullForm's stability.

  /**
   * Handles navigation from the dose input step to the medication source selection.
   * Validates dose input and unit compatibility.
   */
  const handleNextDose = useCallback(() => {
    try {
      // Basic validation for dose presence.
      if (!dose) {
        setFormError('Please enter a dose amount');
        return;
      }

      const numericDose = parseFloat(dose);
      if (isNaN(numericDose) || numericDose <= 0) { // Dose must be a positive number.
        setFormError('Please enter a valid dose amount greater than 0');
        return;
      }

      if (!unit) { // Unit must be selected.
        setFormError('Please select a dose unit');
        return;
      }

      // Check compatibility with the selected concentration unit, if any.
      if (concentrationUnit) {
        const compatibility = validateUnitCompatibility(unit, concentrationUnit);
        if (!compatibility.isValid) {
          setFormError(compatibility.errorMessage || 'Incompatible units. Please select a different dose unit or concentration unit.');
          return;
        }
      }
      
      setDoseValue(numericDose); // Store the parsed dose value.
      // If medication input type is not explicitly set, set to null to allow intelligent selection later.
      if (medicationInputType !== 'concentration' && medicationInputType !== 'totalAmount') {
        setMedicationInputType(null);
      }
      setManualStep('medicationSource'); // Move to the next step.
      setFormError(null); // Clear errors.
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextDose:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [dose, unit, concentrationUnit, medicationInputType]); // Dependencies for validation and state updates.

  /**
   * Handles navigation from medication source selection to either total amount or concentration input.
   */
  const handleNextMedicationSource = useCallback(() => {
    // Navigate based on the selected medication input type.
    if (medicationInputType === 'totalAmount') {
      setManualStep('totalAmountInput');
    } else {
      setManualStep('concentrationInput');
    }
    setFormError(null);
  }, [medicationInputType]);

  /**
   * Handles navigation from concentration input to total amount input or syringe selection.
   * Validates concentration input and unit compatibility.
   */
  const handleNextConcentrationInput = useCallback(() => {
    try {
      if (!concentrationAmount) {
        setFormError('Please enter concentration amount');
        return;
      }

      const numericConcentration = parseFloat(concentrationAmount);
      if (isNaN(numericConcentration) || numericConcentration <= 0) { // Concentration must be positive.
        setFormError('Please enter a valid concentration amount greater than 0');
        return;
      }
      
      if (!concentrationUnit) { // Concentration unit must be selected.
        setFormError('Please select a concentration unit');
        return;
      }

      // Validate compatibility with the selected dose unit.
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units. Please select a different concentration unit.');
        return;
      }

      setConcentration(numericConcentration); // Store parsed concentration.
      
      // If total amount is pre-filled (e.g., from a reconstitution plan), skip to syringe selection.
      if (totalAmount && totalAmount.trim() !== '' && totalAmountHint?.includes('reconstitution planner')) {
        console.log('[useDoseCalculator] Total amount already prefilled, skipping to syringe');
        setManualStep('syringe');
      } else {
        setManualStep('totalAmountInput'); // Otherwise, go to total amount input.
      }
      
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextConcentrationInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [concentrationAmount, concentrationUnit, unit, totalAmount, totalAmountHint]);

  /**
   * Handles navigation from total amount input to reconstitution or syringe selection.
   * Validates total amount input.
   */
  const handleNextTotalAmountInput = useCallback(() => {
    try {
      if (!totalAmount || isNaN(parseFloat(totalAmount))) {
        setFormError('Please enter a valid total amount');
        return;
      }

      const numericTotalAmount = parseFloat(totalAmount);
      if (numericTotalAmount <= 0) { // Total amount must be positive.
        setFormError('Please enter a total amount greater than 0');
        return;
      }

      // If input type is 'totalAmount' (powder for reconstitution):
      // - If solution volume is already known (e.g. from planner), go to syringe.
      // - Otherwise, go to reconstitution step to get solution volume.
      if (medicationInputType === 'totalAmount') {
        if (solutionVolume && solutionVolume.trim() !== '') {
          console.log('[useDoseCalculator] Solution volume already prefilled, skipping reconstitution step');
          setManualStep('syringe');
        } else {
          setManualStep('reconstitution');
          console.log('[useDoseCalculator] Total amount mode: Going to reconstitution step to capture solution volume');
        }
      } else {
        // If input type was 'concentration', this step might be for vial size, then go to syringe.
        // 'solution' was likely a typo and should behave like 'concentration' or be removed if not used.
        setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'syringe');
      }
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextTotalAmountInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [totalAmount, medicationInputType, solutionVolume]);

  /**
   * Handles navigation from reconstitution (solution volume input) to syringe selection.
   * Validates solution volume input.
   */
  const handleNextReconstitution = useCallback(() => {
    try {
      if (!solutionVolume) {
        setFormError('Please enter solution volume');
        return;
      }

      const numericSolutionVolume = parseFloat(solutionVolume);
      if (isNaN(numericSolutionVolume) || numericSolutionVolume <= 0) { // Solution volume must be positive.
        setFormError('Please enter a valid solution volume greater than 0');
        return;
      }

      setManualStep('syringe'); // Proceed to syringe selection.
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextReconstitution:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [solutionVolume]);

  /**
   * Performs the final dose calculation by calling `calculateDose` from `doseUtils.ts`.
   * Validates all necessary inputs before attempting calculation.
   * Handles potential errors, including volume threshold errors which trigger a specific modal.
   */
  const handleCalculateFinal = useCallback(() => {
    try {
      console.log('[useDoseCalculator] handleCalculateFinal called');
      
      // Essential validations before calling the calculation utility.
      if (!doseValue || doseValue <= 0) {
        setCalculationError('Invalid dose value. Please go back and enter a valid dose.');
        setManualStep('preDoseConfirmation'); // Stay on confirmation but show error.
        return;
      }

      if (!manualSyringe || !manualSyringe.volume) {
        setCalculationError('Invalid syringe selection. Please go back and select a valid syringe.');
        setManualStep('preDoseConfirmation');
        return;
      }

      // Concentration is not needed if dose is in mL.
      if (unit !== 'mL') {
        // If not using totalAmount mode (where concentration is calculated), concentration must be provided.
        if ((concentration === null || concentration <= 0) && medicationInputType !== 'totalAmount') {
          setCalculationError('Invalid concentration. Please go back and enter a valid concentration.');
          setManualStep('preDoseConfirmation');
          return;
        }
      }

      // Unit compatibility check (skip if dose is in mL).
      if (unit !== 'mL') {
        const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
        if (!unitCompatibility.isValid) {
          setCalculationError(unitCompatibility.errorMessage || 'Unit mismatch between dose and concentration.');
          setManualStep('preDoseConfirmation');
          return;
        }
      }

      let totalAmountValue = totalAmount ? parseFloat(totalAmount) : null;
      const syringeObj = manualSyringe; // Already in the correct {type, volume} format.

      // Dynamically import calculateDose to potentially aid code splitting, though its impact here might be minor.
      const { calculateDose } = require('../doseUtils');
      const result = calculateDose({
        doseValue,
        concentration,
        unit,
        concentrationUnit,
        totalAmount: totalAmountValue,
        manualSyringe: syringeObj,
        solutionVolume, // Pass solutionVolume for on-the-fly concentration calculation if needed.
      });

      console.log('[useDoseCalculator] Calculation result:', result);

      // Handle specific volume threshold error by showing a modal.
      if (result.calculationError && result.calculationError.startsWith("VOLUME_THRESHOLD_ERROR:")) {
        setShowVolumeErrorModal(true);
        setVolumeErrorValue(result.calculatedVolume); // Store the problematic volume.
        setCalculationError(null); // Clear generic error as specific modal handles this.
        // Store other results so they are available if modal is cancelled/ignored.
        setCalculatedVolume(result.calculatedVolume);
        setRecommendedMarking(result.recommendedMarking);
        setCalculatedConcentration(result.calculatedConcentration || null);
      } else {
        // Set all results from the calculation.
        setCalculatedVolume(result.calculatedVolume);
        setRecommendedMarking(result.recommendedMarking);
        setCalculationError(result.calculationError);
        setCalculatedConcentration(result.calculatedConcentration || null);
      }

      setManualStep('preDoseConfirmation'); // Always go to pre-dose confirmation step.
      console.log('[useDoseCalculator] Set manualStep to preDoseConfirmation');
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
      setManualStep('preDoseConfirmation'); // Go to confirmation even on unexpected error.
      console.log('[useDoseCalculator] Set manualStep to preDoseConfirmation (after error)');
    }
  }, [doseValue, concentration, manualSyringe, unit, totalAmount, concentrationUnit, solutionVolume, medicationInputType]);

  /**
   * Handles navigation from the pre-dose confirmation step to the final result display.
   */
  const handleNextPreDoseConfirmation = useCallback(() => {
    try {
      console.log('[useDoseCalculator] handleNextPreDoseConfirmation called');
      setManualStep('finalResult'); // Move to final result screen.
      console.log('[useDoseCalculator] Set manualStep to finalResult');
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextPreDoseConfirmation:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, []);

  /**
   * Closes the volume error modal.
   */
  const handleCloseVolumeErrorModal = useCallback(() => {
    setShowVolumeErrorModal(false);
    lastActionTimestamp.current = Date.now();
  }, []);

  /**
   * Handles the action to re-enter vial data, typically from the volume error modal.
   * Resets concentration, total amount, and related calculated fields.
   */
  const handleReEnterVialData = useCallback(() => {
    setShowVolumeErrorModal(false);
    // Clear vial-specific data.
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml'); // Reset to default or last valid.
    setTotalAmount('');
    setSolutionVolume('');
    // Clear calculated values derived from vial data.
    setConcentration(null);
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    // Optionally, could also clear the dose itself if it's deemed related to the vial error.
    // setDose('');
    // setDoseValue(null);
    setManualStep('medicationSource'); // Go back to medication source selection.
    lastActionTimestamp.current = Date.now();
  }, []);

  /**
   * Handles back navigation through the manual input steps.
   */
  const handleBack = useCallback(() => {
    try {
      // Determine previous step based on current manualStep and medicationInputType.
      if (manualStep === 'dose') setScreenStep('intro'); // From dose, go to main intro.
      else if (manualStep === 'medicationSource') setManualStep('dose');
      else if (manualStep === 'concentrationInput') setManualStep('medicationSource');
      else if (manualStep === 'totalAmountInput') {
        // If coming from 'totalAmount' mode, previous is 'medicationSource'.
        // Otherwise (likely 'concentration' mode), previous is 'concentrationInput'.
        if (medicationInputType === 'totalAmount') {
          setManualStep('medicationSource');
        } else {
          setManualStep('concentrationInput');
        }
      }
      else if (manualStep === 'reconstitution') setManualStep('totalAmountInput');
      // For syringe step, previous depends on whether reconstitution was done.
      else if (manualStep === 'syringe') setManualStep(medicationInputType === 'solution' || (medicationInputType === 'totalAmount' && !solutionVolume) ? 'reconstitution' : 'totalAmountInput');
      else if (manualStep === 'preDoseConfirmation') setManualStep('syringe');
      else if (manualStep === 'finalResult') setManualStep('preDoseConfirmation');

      setFormError(null); // Clear any form errors on back navigation.
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleBack:', error);
      resetFullForm(); // Reset to a clean state on error.
      setScreenStep('intro');
    }
  }, [manualStep, medicationInputType, resetFullForm, solutionVolume]); // solutionVolume added as it can affect back path from syringe.

  /**
   * Resets the form and navigates to the intro screen.
   */
  const handleStartOver = useCallback(() => {
    resetFullForm('dose');
    setScreenStep('intro');
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  /**
   * Navigates to the intro screen and resets the form.
   * Similar to handleStartOver, but can be used for explicit "Home" actions.
   */
  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm('dose');
  }, [resetFullForm]);

  /**
   * Handles the transition to the feedback flow after dose calculation is complete.
   * Logs analytics, tracks interactions, records session for surveys, and sets up feedback context.
   * @param {'new_dose' | 'scan_again' | 'start_over'} nextAction - The action to perform after feedback.
   */
  const handleGoToFeedback = useCallback(async (nextAction: 'new_dose' | 'scan_again' | 'start_over') => {
    logAnalyticsEvent(ANALYTICS_EVENTS.MANUAL_ENTRY_COMPLETED); // Log completion event.
    
    if (trackInteraction) { // Track interaction if callback is provided.
      trackInteraction();
    }
    
    const sessionType = lastActionType === 'scan' ? 'scan' : 'manual';
    await pmfSurvey.recordDoseSession(sessionType); // Record session for PMF survey.
    
    // Set up context for the feedback screen.
    setFeedbackContext({
      nextAction,
      doseInfo: {
        substanceName,
        doseValue,
        unit,
        calculatedVolume,
        syringeType: manualSyringe?.type || null,
        recommendedMarking,
        injectionSite: selectedInjectionSite, // Will be updated after site selection.
      },
    });
    
    setScreenStep('injectionSiteSelection'); // First, ask for injection site.
  }, [trackInteraction, substanceName, doseValue, unit, calculatedVolume, manualSyringe, recommendedMarking, selectedInjectionSite, lastActionType, pmfSurvey]);


  /**
   * Called when an injection site is selected. Updates feedback context and proceeds
   * to "Why Are You Here?", PMF survey, or post-dose feedback screen.
   */
  const handleInjectionSiteSelected = useCallback(async () => {
    if (!feedbackContext) return; // Should not happen if flow is correct.
    
    // Update feedback context with the newly selected injection site.
    setFeedbackContext(prevContext => ({
      ...prevContext!,
      doseInfo: {
        ...prevContext!.doseInfo,
        injectionSite: selectedInjectionSite,
      },
    }));
    
    // Determine next step: "Why Are You Here?", PMF survey, or standard feedback.
    if (whyAreYouHereTracking.shouldShowPrompt()) {
      setScreenStep('whyAreYouHere');
    } else {
      const sessionType = lastActionType === 'scan' ? 'scan' : 'manual';
      // Re-check PMF survey status as it might depend on cumulative sessions.
      const triggerData = await pmfSurvey.recordDoseSession(sessionType); // Ensure PMF status is current.
      if (triggerData.shouldShowSurvey) {
        setScreenStep('pmfSurvey');
      } else {
        setScreenStep('postDoseFeedback');
      }
    }
  }, [feedbackContext, selectedInjectionSite, lastActionType, whyAreYouHereTracking, pmfSurvey]);

  /**
   * Handles cancellation from the injection site selection screen.
   * Returns the user to the final result display of the manual entry flow.
   */
  const handleInjectionSiteCancel = useCallback(() => {
    setScreenStep('manualEntry'); // Go back to the main manual entry flow.
    setManualStep('finalResult'); // Show the final calculated results again.
    setFeedbackContext(null); // Clear feedback context as the flow was interrupted.
    setSelectedInjectionSite(null); // Clear selected site.
  }, []);

  /**
   * Handles completion of the feedback process.
   * Increments dose count for power user promotion, logs the dose,
   * checks for log limits or power user promotion eligibility, and navigates to the next action.
   */
  const handleFeedbackComplete = useCallback(async () => {
    console.log('[useDoseCalculator] handleFeedbackComplete called', { feedbackContext });
    if (!feedbackContext) return; // Ensure feedback context exists.
    
    await powerUserPromotion.incrementDoseCount(); // Track dose for power user features.
    
    // Automatically log the dose with all its details.
    const logResult = await logDose(feedbackContext.doseInfo);
    console.log('[useDoseCalculator] Log result:', logResult);
    
    // Small delay to allow state updates (like dose count) to propagate before checking promotion status.
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const shouldShowPowerUserPromotion = powerUserPromotion.shouldShowPromotion();
    
    if (logResult.success && trackInteraction) { // Track interaction if dose logged successfully.
      trackInteraction();
    }
    
    // Safety check: Prevent log limit modal for users with very low usage to avoid false positives.
    const currentLogUsage = powerUserPromotion.promotionData.doseCount;
    const MINIMUM_USAGE_FOR_LIMIT_MODAL = 10;
    
    if (logResult.limitReached) {
      if (currentLogUsage < MINIMUM_USAGE_FOR_LIMIT_MODAL) {
        console.log('[useDoseCalculator] 🛡️ ABSOLUTE SAFETY: Blocking log limit modal - insufficient usage:', currentLogUsage);
        // Skip modal and continue.
      } else {
        console.log('[useDoseCalculator] ❌ Log limit reached with sufficient usage, showing LOG LIMIT modal');
        setLogLimitModalTriggerReason('log_limit');
        setShowLogLimitModal(true);
        return; // Halt navigation, modal takes over.
      }
    }

    if (shouldShowPowerUserPromotion) {
      // Safety check: Ensure minimum doses for power user promotion.
      if (powerUserPromotion.promotionData.doseCount < MIN_DOSES_FOR_PROMOTION) {
        console.log('[useDoseCalculator] 🛡️ SAFETY CHECK: Preventing power user promotion due to insufficient doses.');
      } else {
        console.log('[useDoseCalculator] ✅ Power user promotion criteria met, showing POWER USER PROMOTION modal');
        await powerUserPromotion.markPromotionShown(); // Mark that promotion has been shown.
        setLogLimitModalTriggerReason('power_user_promotion');
        setShowLogLimitModal(true);
        return; // Halt navigation, modal takes over.
      }
    }
    
    // If no modals are shown, proceed with navigation based on `nextAction`.
    const nextAction = feedbackContext.nextAction;
    setFeedbackContext(null); // Clear feedback context.
    
    if (nextAction === 'start_over') {
      resetFullForm('dose');
      setLastActionType(null);
      setScreenStep('intro');
    } else if (nextAction === 'new_dose') {
      resetFullForm('dose');
      // Repeat the last primary action (scan or manual).
      if (lastActionType === 'scan') {
        const canProceed = await checkUsageLimit(); // Check scan limits.
        if (canProceed) {
          setTimeout(() => setScreenStep('scan'), 100); // Delay for state cleanup.
        } else {
          setScreenStep('intro'); // Fallback to intro if scan limit reached.
        }
      } else if (lastActionType === 'manual') {
        setScreenStep('manualEntry');
      } else {
        setScreenStep('intro'); // Default to intro.
      }
    } else if (nextAction === 'scan_again') { // Legacy action.
      const canProceed = await checkUsageLimit();
      if (canProceed) {
        setTimeout(() => setScreenStep('scan'), 100);
      } else {
        setScreenStep('intro');
      }
    } else {
      console.log('[useDoseCalculator] ⚠️ Unknown next action:', nextAction);
      setScreenStep('intro'); // Fallback for unknown actions.
    }
    
    lastActionTimestamp.current = Date.now();
  }, [feedbackContext, resetFullForm, checkUsageLimit, logDose, trackInteraction, powerUserPromotion, lastActionType]);


  /**
   * Handles completion of the PMF (Product-Market Fit) survey.
   * Submits survey responses and navigates to the post-dose feedback screen.
   * @param {any} responses - The collected survey responses.
   */
  const handlePMFSurveyComplete = useCallback(async (responses: any) => {
    console.log('[useDoseCalculator] PMF survey completed', responses);
    await pmfSurvey.submitPMFSurvey(responses);
    setScreenStep('postDoseFeedback'); // Proceed to standard feedback screen.
  }, [pmfSurvey]);

  /**
   * Handles skipping of the PMF survey.
   * Marks survey as skipped and navigates to the post-dose feedback screen.
   */
  const handlePMFSurveySkip = useCallback(() => {
    console.log('[useDoseCalculator] PMF survey skipped');
    pmfSurvey.skipPMFSurvey();
    setScreenStep('postDoseFeedback'); // Proceed to standard feedback screen.
  }, [pmfSurvey]);

  /**
   * Handles submission of the "Why Are You Here?" survey.
   * Stores the response and then navigates to PMF survey or post-dose feedback.
   * @param {any} response - The selected response.
   * @param {string} [customText] - Optional custom text input by the user.
   */
  const handleWhyAreYouHereSubmit = useCallback(async (response: any, customText?: string) => {
    console.log('[useDoseCalculator] WhyAreYouHere response submitted:', response);
    await whyAreYouHereTracking.markPromptAsShown();
    await whyAreYouHereTracking.storeResponse(response, customText);
    
    // Determine next step: PMF survey or standard feedback.
    if (pmfSurvey.triggerData?.shouldShowSurvey) {
      setScreenStep('pmfSurvey');
    } else {
      setScreenStep('postDoseFeedback');
    }
  }, [whyAreYouHereTracking, pmfSurvey]);

  /**
   * Handles skipping of the "Why Are You Here?" survey.
   * Marks survey as skipped and navigates to PMF survey or post-dose feedback.
   */
  const handleWhyAreYouHereSkip = useCallback(async () => {
    console.log('[useDoseCalculator] WhyAreYouHere prompt skipped');
    await whyAreYouHereTracking.markPromptAsShown(); // Mark as shown (but skipped).
    
    if (pmfSurvey.triggerData?.shouldShowSurvey) {
      setScreenStep('pmfSurvey');
    } else {
      setScreenStep('postDoseFeedback');
    }
  }, [whyAreYouHereTracking, pmfSurvey]);

  /**
   * Handles the initiation of a capture/scan action.
   * Checks usage limits before proceeding.
   * @returns {Promise<boolean>} True if the capture can proceed, false otherwise.
   */
  const handleCapture = useCallback(async () => {
    try {
      const canProceed = await checkUsageLimit(); // Check if scan/capture is allowed.
      if (!canProceed) return false;
      setManualStep('dose'); // Reset manual step to dose for potential manual fallback.
      lastActionTimestamp.current = Date.now();
      return true;
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCapture:', error);
      return false;
    }
  }, [checkUsageLimit]);

  // Effect for monitoring state health and resetting if inactive for too long.
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

  /**
   * Handles closing of the log limit or power user promotion modal.
   * Navigates to the next appropriate screen if the modal was for power user promotion.
   */
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
    setConcentrationAmount,
    concentrationUnit,
    setConcentrationUnit,
    totalAmount,
    setTotalAmount,
    solutionVolume,
    setSolutionVolume,
    manualSyringe,
    setManualSyringe: (syringe: { type: 'Insulin' | 'Standard'; volume: string } | string) => {
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
        setManualSyringe({ type: 'Standard', volume: '3 ml' });
      }
    },
    doseValue,
    setDoseValue,
    concentration,
    setConcentration,
    calculatedVolume,
    setCalculatedVolume,
    calculatedConcentration,
    setCalculatedConcentration,
    recommendedMarking,
    setRecommendedMarking,
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
    volumeErrorValue,
    handleCloseVolumeErrorModal,
    handleReEnterVialData,
    // Feedback context
    feedbackContext,
    setFeedbackContext,
    handleGoToFeedback,
    handleFeedbackComplete,
    // WhyAreYouHere handlers
    handleWhyAreYouHereSubmit,
    handleWhyAreYouHereSkip,
    // Log limit modal
    showLogLimitModal,
    logLimitModalTriggerReason,
    handleCloseLogLimitModal,
    handleContinueWithoutSaving,
    logUsageData,
    // PMF Survey
    pmfSurveyTriggerData: pmfSurvey.triggerData,
    handlePMFSurveyComplete,
    handlePMFSurveySkip,
    // Injection site selection
    selectedInjectionSite,
    setSelectedInjectionSite,
    handleInjectionSiteSelected,
    handleInjectionSiteCancel,
  };
}