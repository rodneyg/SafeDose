import { useState, useCallback, useRef, useEffect } from 'react';
import { validateUnitCompatibility, getCompatibleConcentrationUnits } from '../doseUtils';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { type: 'Insulin' | 'Standard'; volume: string };
type ResetFullFormFunc = (startStep?: ManualStep) => void;

interface UseDoseCalculatorProps {
  checkUsageLimit: () => Promise<boolean>;
}

const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

/**
 * Custom hook for managing dose calculation logic and state.
 *
 * This hook encapsulates the entire state management for the dose calculation process,
 * including user inputs, screen navigation, validation, and calculation results.
 *
 * @param props - Properties for the hook.
 * @param props.checkUsageLimit - Function to check if the usage limit has been reached.
 * @returns An object containing state variables and functions to interact with the dose calculator.
 *   - `screenStep`: Current screen step ('intro', 'scan', 'manualEntry').
 *   - `setScreenStep`: Function to set the current screen step.
 *   - `manualStep`: Current step in the manual entry process.
 *   - `setManualStep`: Function to set the current manual entry step.
 *   - `dose`, `setDose`: Dose amount string and setter.
 *   - `unit`, `setUnit`: Dose unit and setter.
 *   - `substanceName`, `setSubstanceName`: Substance name string and setter.
 *   - `medicationInputType`, `setMedicationInputType`: Type of medication input ('totalAmount' or other) and setter.
 *   - `concentrationAmount`, `setConcentrationAmount`: Concentration amount string and setter.
 *   - `concentrationUnit`, `setConcentrationUnit`: Concentration unit and setter.
 *   - `totalAmount`, `setTotalAmount`: Total amount of medication string and setter.
 *   - `solutionVolume`, `setSolutionVolume`: Solution volume string for reconstitution and setter.
 *   - `manualSyringe`, `setManualSyringe`: Selected syringe details and setter.
 *   - `doseValue`, `setDoseValue`: Parsed numeric dose value and setter.
 *   - `concentration`, `setConcentration`: Parsed numeric concentration value and setter.
 *   - `calculatedVolume`, `setCalculatedVolume`: Calculated dose volume and setter.
 *   - `calculatedConcentration`, `setCalculatedConcentration`: Calculated concentration (if applicable) and setter.
 *   - `recommendedMarking`, `setRecommendedMarking`: Recommended syringe marking and setter.
 *   - `calculationError`, `setCalculationError`: Error message from calculation and setter.
 *   - `formError`, `setFormError`: Error message for form validation and setter.
 *   - `substanceNameHint`, `setSubstanceNameHint`: Hint for substance name input and setter.
 *   - `concentrationHint`, `setConcentrationHint`: Hint for concentration input and setter.
 *   - `totalAmountHint`, `setTotalAmountHint`: Hint for total amount input and setter.
 *   - `syringeHint`, `setSyringeHint`: Hint for syringe selection and setter.
 *   - `resetFullForm`: Function to reset the entire form state.
 *   - `handleNextDose`: Function to proceed from dose input step.
 *   - `handleNextMedicationSource`: Function to proceed from medication source selection.
 *   - `handleNextConcentrationInput`: Function to proceed from concentration input.
 *   - `handleNextTotalAmountInput`: Function to proceed from total amount input.
 *   - `handleNextReconstitution`: Function to proceed from reconstitution input.
 *   - `handleCalculateFinal`: Function to perform the final dose calculation.
 *   - `handleBack`: Function to navigate to the previous step.
 *   - `handleStartOver`: Function to reset the form and go to the intro screen.
 *   - `handleGoHome`: Function to go to the intro screen and reset the form.
 *   - `handleCapture`: Function to initiate the capture process (e.g., scanning).
 *   - `stateHealth`: Indicates the health of the hook's internal state ('healthy', 'recovering').
 *   - `validateDoseInput`: Function to validate dose input.
 *   - `validateConcentrationInput`: Function to validate concentration input.
 */
export default function useDoseCalculator({ checkUsageLimit }: UseDoseCalculatorProps) {
  const isInitialized = useRef(false);
  const lastActionTimestamp = useRef(Date.now());

  const [screenStep, setScreenStep] = useState<ScreenStep>('intro');
  const [manualStep, setManualStep] = useState<ManualStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'units' | 'mL'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<string>('totalAmount');
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
  const [formError, setFormError] = useState<string | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);
  const [stateHealth, setStateHealth] = useState<'healthy' | 'recovering'>('healthy');

  /**
   * Validates the dose input fields.
   * @param doseValue - The string value of the dose.
   * @param doseUnit - The selected unit for the dose.
   * @returns True if the input is valid, false otherwise.
   */
  const validateDoseInput = useCallback((doseValue: string, doseUnit: 'mg' | 'mcg' | 'units' | 'mL'): boolean => {
    const numericDose = parseFloat(doseValue);
    if (!doseValue || isNaN(numericDose) || numericDose <= 0) {
      setFormError('Please enter a valid dose amount greater than 0');
      return false;
    }
    
    if (concentrationUnit && doseUnit) {
      const compatibility = validateUnitCompatibility(doseUnit, concentrationUnit);
      if (!compatibility.isValid) {
        setFormError(compatibility.errorMessage || 'Incompatible units');
        return false;
      }
    }
    
    setFormError(null);
    return true;
  }, [concentrationUnit]);

  /**
   * Validates the concentration input fields.
   * @param amount - The string value of the concentration.
   * @param concUnit - The selected unit for the concentration.
   * @returns True if the input is valid, false otherwise.
   */
  const validateConcentrationInput = useCallback((amount: string, concUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'): boolean => {
    const numericAmount = parseFloat(amount);
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

  /**
   * Resets the entire form state to its initial values.
   * @param startStep - Optional. The manual step to reset to, defaults to 'dose'.
   */
  const resetFullForm = useCallback((startStep: ManualStep = 'dose') => {
    console.log('[useDoseCalculator] Resetting form state', { startStep });
    lastActionTimestamp.current = Date.now();

    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('totalAmount');
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
    setTotalAmount('');
    setSolutionVolume('');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setCalculatedConcentration(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setSyringeHint(null);
    setManualStep(startStep);
    setStateHealth('healthy');

    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('[useDoseCalculator] Marked as initialized');
    }
  }, []);

  /**
   * Safely sets the screen step, handling potential initialization and navigation issues.
   * @param step - The screen step to navigate to.
   */
  const safeSetScreenStep = useCallback((step: ScreenStep) => {
    console.log('[useDoseCalculator] Setting screen step to:', step);
    try {
      lastActionTimestamp.current = Date.now();
      
      // If we're navigating to a new screen, ensure we're properly initialized
      if ((step === 'scan' || step === 'manualEntry') && !isInitialized.current) {
        console.log('[useDoseCalculator] Initializing state during navigation to:', step);
        isInitialized.current = true;
      }
      
      // Store previous step to detect potential navigation loops
      const prevStep = screenStep;
      
      // Actually update the screen step
      setScreenStep(step);
      
      // Ensure we properly track when the intro screen gets set
      if (step === 'intro') {
        console.log('[useDoseCalculator] Intro screen set explicitly');
      }
      
      // Log potentially problematic navigation transitions for debugging
      if (prevStep === step && step !== 'intro') {
        console.warn(`[useDoseCalculator] Redundant navigation to ${step}, could indicate an issue`);
      }
      
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

  /**
   * Effect hook to initialize the form state when the component mounts.
   * It ensures that the form is reset and the screen is set to 'intro'.
   */
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('[useDoseCalculator] Initial setup');
      resetFullForm('dose');
      
      // Ensure we start on intro screen
      setScreenStep('intro');
      console.log('[useDoseCalculator] Initialization complete - screen set to intro');
    }
  }, [resetFullForm]);

  /**
   * Handles the action to proceed from the dose input step.
   * Validates the dose and unit, then navigates to the medication source step.
   */
  const handleNextDose = useCallback(() => {
    try {
      if (!dose) {
        setFormError('Please enter a dose amount');
        return;
      }

      const numericDose = parseFloat(dose);
      if (isNaN(numericDose) || numericDose <= 0) {
        setFormError('Please enter a valid dose amount greater than 0');
        return;
      }

      if (!unit) {
        setFormError('Please select a dose unit');
        return;
      }

      // Ensure compatibility with any already selected concentration unit
      if (concentrationUnit) {
        const compatibility = validateUnitCompatibility(unit, concentrationUnit);
        if (!compatibility.isValid) {
          setFormError(compatibility.errorMessage || 'Incompatible units. Please select a different dose unit or concentration unit.');
          return;
        }
      }
      
      setDoseValue(numericDose);
      setMedicationInputType(null); // Set to null to trigger intelligent guessing
      setManualStep('medicationSource');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextDose:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [dose, unit, concentrationUnit, setMedicationInputType]);

  /**
   * Handles the action to proceed from the medication source selection step.
   * Navigates to either total amount input or concentration input based on selection.
   */
  const handleNextMedicationSource = useCallback(() => {
    if (medicationInputType === 'totalAmount') {
      setManualStep('totalAmountInput');
    } else {
      setManualStep('concentrationInput');
    }
    setFormError(null);
  }, [medicationInputType]);

  /**
   * Handles the action to proceed from the concentration input step.
   * Validates concentration and unit, then navigates to the total amount input step.
   */
  const handleNextConcentrationInput = useCallback(() => {
    try {
      if (!concentrationAmount) {
        setFormError('Please enter concentration amount');
        return;
      }

      const numericConcentration = parseFloat(concentrationAmount);
      if (isNaN(numericConcentration) || numericConcentration <= 0) {
        setFormError('Please enter a valid concentration amount greater than 0');
        return;
      }
      
      if (!concentrationUnit) {
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
      setManualStep('totalAmountInput');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextConcentrationInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [concentrationAmount, concentrationUnit, unit]);

  /**
   * Handles the action to proceed from the total amount input step.
   * Validates the total amount and navigates to the reconstitution or syringe step.
   */
  const handleNextTotalAmountInput = useCallback(() => {
    try {
      if (!totalAmount || isNaN(parseFloat(totalAmount))) {
        setFormError('Please enter a valid total amount');
        return;
      }

      const numericTotalAmount = parseFloat(totalAmount);
      if (numericTotalAmount <= 0) {
        setFormError('Please enter a total amount greater than 0');
        return;
      }

      // Always go to reconstitution step when using totalAmount input mode 
      // to ensure we get solutionVolume for calculating concentration
      if (medicationInputType === 'totalAmount') {
        setManualStep('reconstitution');
        console.log('[useDoseCalculator] Total amount mode: Going to reconstitution step to capture solution volume');
      } else {
        setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'syringe');
      }
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextTotalAmountInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [totalAmount, medicationInputType]);

  /**
   * Handles the action to proceed from the reconstitution (solution volume) input step.
   * Validates the solution volume and navigates to the syringe selection step.
   */
  const handleNextReconstitution = useCallback(() => {
    try {
      if (!solutionVolume) {
        setFormError('Please enter solution volume');
        return;
      }

      const numericSolutionVolume = parseFloat(solutionVolume);
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

  /**
   * Handles the final calculation of the dose.
   * Validates all necessary inputs, performs the calculation using `doseUtils`,
   * and sets the calculated volume, recommended marking, and any errors.
   * Navigates to the final result step.
   */
  const handleCalculateFinal = useCallback(() => {
    try {
      console.log('[useDoseCalculator] handleCalculateFinal called');
      
      // Validate required inputs before calculation
      if (!doseValue || doseValue <= 0) {
        setCalculationError('Invalid dose value. Please go back and enter a valid dose.');
        setManualStep('finalResult');
        return;
      }

      if (!manualSyringe || !manualSyringe.volume) {
        setCalculationError('Invalid syringe selection. Please go back and select a valid syringe.');
        setManualStep('finalResult');
        return;
      }

      // For concentration and totalAmount, their necessity depends on input mode
      if (unit !== 'mL') { // mL as dose unit doesn't require concentration
        if ((concentration === null || concentration <= 0) && medicationInputType !== 'totalAmount') {
          setCalculationError('Invalid concentration. Please go back and enter a valid concentration.');
          setManualStep('finalResult');
          return;
        }
      }

      // Ensure unit compatibility
      if (unit !== 'mL') { // Skip for mL as dose unit
        const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
        if (!unitCompatibility.isValid) {
          setCalculationError(unitCompatibility.errorMessage || 'Unit mismatch between dose and concentration.');
          setManualStep('finalResult');
          return;
        }
      }

      // Prepare total amount value
      let totalAmountValue = totalAmount ? parseFloat(totalAmount) : null;
      if (unit === 'mcg' && totalAmountValue && concentrationUnit === 'mg/ml') {
        // Convert mcg dose to mg for comparison with mg/ml concentration
        totalAmountValue /= 1000;
      } else if (unit === 'mg' && totalAmountValue && concentrationUnit === 'mcg/ml') {
        // Convert mg dose to mcg for comparison with mcg/ml concentration
        totalAmountValue *= 1000;
      }

      // Use the manualSyringe object directly, as it's already in the correct format
      const syringeObj = manualSyringe;

      const { calculateDose } = require('../doseUtils');
      const result = calculateDose({
        doseValue,
        concentration,
        unit,
        concentrationUnit,
        totalAmount: totalAmountValue,
        manualSyringe: syringeObj,
        solutionVolume, // Add solutionVolume for concentration calculation
      });

      console.log('[useDoseCalculator] Calculation result:', { 
        calculatedVolume: result.calculatedVolume,
        recommendedMarking: result.recommendedMarking,
        calculatedConcentration: result.calculatedConcentration,
        calculationError: result.calculationError 
      });

      setCalculatedVolume(result.calculatedVolume);
      setRecommendedMarking(result.recommendedMarking);
      setCalculationError(result.calculationError);
      setCalculatedConcentration(result.calculatedConcentration || null);

      // Always navigate to finalResult screen regardless of calculation errors
      // Previously only navigated if there was no error or a recommendedMarking was available
      setManualStep('finalResult');
      console.log('[useDoseCalculator] Set manualStep to finalResult');
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
      // Ensure we still navigate to the results screen even if there's an error
      setManualStep('finalResult');
      console.log('[useDoseCalculator] Set manualStep to finalResult (after error)');
    }
  }, [doseValue, concentration, manualSyringe, unit, totalAmount, concentrationUnit, solutionVolume, medicationInputType]);

  /**
   * Handles the action to go back to the previous step in the manual entry process.
   * Updates the `manualStep` or `screenStep` accordingly.
   */
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
      else if (manualStep === 'syringe') setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'totalAmountInput');
      else if (manualStep === 'finalResult') setManualStep('syringe');

      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleBack:', error);
      resetFullForm();
      setScreenStep('intro');
    }
  }, [manualStep, medicationInputType, resetFullForm]);

  /**
   * Handles the action to start the form over from the beginning.
   * Resets the form and navigates to the intro screen.
   */
  const handleStartOver = useCallback(() => {
    resetFullForm('dose');
    setScreenStep('intro');
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  /**
   * Handles the action to go to the home/intro screen.
   * Resets the form and navigates to the intro screen.
   */
  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm('dose');
  }, [resetFullForm]);

  /**
   * Handles the initiation of a capture action (e.g., scanning a medication).
   * Checks usage limits before proceeding.
   * @returns A promise that resolves to true if the capture process can proceed, false otherwise.
   */
  const handleCapture = useCallback(async () => {
    try {
      const canProceed = await checkUsageLimit();
      if (!canProceed) return false;
      setManualStep('dose');
      lastActionTimestamp.current = Date.now();
      return true;
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCapture:', error);
      return false;
    }
  }, [checkUsageLimit]);

  /**
   * Effect hook to periodically check the "health" of the hook's state.
   * If the state is detected as stale (no action for a long time), it resets the form.
   */
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
    handleBack,
    handleStartOver,
    handleGoHome,
    handleCapture,
    stateHealth,
    validateDoseInput,
    validateConcentrationInput,
  };
}