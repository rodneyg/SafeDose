import { useState, useCallback, useRef, useEffect } from 'react';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { volume: string };

interface UseDoseCalculatorProps {
  checkUsageLimit: () => Promise<boolean>;
}

// Function to check if a value is valid and non-empty
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

export default function useDoseCalculator({ checkUsageLimit }: UseDoseCalculatorProps) {
  // Use a ref to track if this is the first render or a re-render after navigation
  const isInitialized = useRef(false);
  // Track last successful navigation to detect and recover from broken state
  const lastActionTimestamp = useRef(Date.now());
  
  const [screenStep, setScreenStep] = useState<ScreenStep>('intro');
  const [manualStep, setManualStep] = useState<ManualStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<string>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<string>('powder');
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<string>('mg/mL');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('');
  const [manualSyringe, setManualSyringe] = useState<string>('1mL');
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<number | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);
  
  // Track state health to detect and recover from broken state
  const [stateHealth, setStateHealth] = useState<'healthy' | 'recovering'>('healthy');
  
  // Make sure resetFullForm is stable and properly typed
  const resetFullForm = useCallback((startStep?: 'dose') => {
    console.log('[useDoseCalculator] Resetting form state', { startStep });
    
    // Update timestamp when we reset the form
    lastActionTimestamp.current = Date.now();
    
    // Reset all state variables to their defaults
    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('powder');
    setConcentrationAmount('');
    setConcentrationUnit('mg/mL');
    setTotalAmount('');
    setSolutionVolume('');
    setManualSyringe('1mL');
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setFormError(null);
    setSubstanceNameHint(null);
    setConcentrationHint(null);
    setTotalAmountHint(null);
    setSyringeHint(null);
    setManualStep(startStep || 'dose');
    setStateHealth('healthy');
    
    // Mark as initialized after first reset
    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('[useDoseCalculator] Marked as initialized');
    }
  }, []);
  
  // Safe setScreenStep that includes error recovery
  const safeSetScreenStep = useCallback((step: ScreenStep) => {
    console.log('[useDoseCalculator] Setting screen step to:', step);
    
    try {
      // Update last action timestamp to indicate activity
      lastActionTimestamp.current = Date.now();
      
      // Special handling for 'manualEntry' to ensure state is consistent
      if (step === 'manualEntry') {
        // Check if we have the required state for this step
        if (!isInitialized.current) {
          console.log('[useDoseCalculator] First-time transition to manualEntry, initializing state');
          resetFullForm('dose');
        }
      }
      
      setScreenStep(step);
    } catch (error) {
      console.error('[useDoseCalculator] Error in safeSetScreenStep:', error);
      // Recover from error by resetting to a known good state
      resetFullForm();
      setScreenStep('intro');
      setStateHealth('recovering');
    }
  }, [resetFullForm]);
  
  // Initialize the hook the first time it's mounted
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('[useDoseCalculator] Initial setup');
      resetFullForm('dose');
    }
  }, [resetFullForm]);

  const handleNextDose = useCallback(() => {
    try {
      if (!dose || !unit) {
        setFormError('Please enter a dose and unit');
        return;
      }
      setDoseValue(parseFloat(dose));
      setManualStep('medicationSource');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextDose:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [dose, unit]);

  const handleNextMedicationSource = useCallback(() => {
    try {
      if (!substanceName) {
        setFormError('Please enter a substance name');
        return;
      }
      setManualStep('concentrationInput');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextMedicationSource:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [substanceName]);

  const handleNextConcentrationInput = useCallback(() => {
    try {
      if (!concentrationAmount || !concentrationUnit) {
        setFormError('Please enter concentration amount and unit');
        return;
      }
      setConcentration(parseFloat(concentrationAmount));
      setManualStep('totalAmountInput');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextConcentrationInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [concentrationAmount, concentrationUnit]);

  const handleNextTotalAmountInput = useCallback(() => {
    try {
      if (!totalAmount) {
        setFormError('Please enter total amount');
        return;
      }
      setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'syringe');
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleNextTotalAmountInput:', error);
      setFormError('An unexpected error occurred. Please try again.');
    }
  }, [totalAmount, medicationInputType]);

  const handleNextReconstitution = useCallback(() => {
    try {
      if (!solutionVolume) {
        setFormError('Please enter solution volume');
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
      if (!doseValue || !concentration || !manualSyringe) {
        setCalculationError('Missing required fields for calculation');
        return;
      }
      
      const volume = doseValue / concentration;
      const syringeCapacity = parseFloat(manualSyringe);
      if (volume > syringeCapacity) {
        setCalculationError(`Calculated volume (${volume.toFixed(2)} mL) exceeds syringe capacity (${syringeCapacity} mL)`);
        return;
      }
      setCalculatedVolume(volume);
      setRecommendedMarking(volume);
      setManualStep('finalResult');
      setCalculationError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
    }
  }, [doseValue, concentration, manualSyringe]);

  const handleBack = useCallback(() => {
    try {
      if (manualStep === 'dose') {
        setScreenStep('intro');
      } else if (manualStep === 'medicationSource') {
        setManualStep('dose');
      } else if (manualStep === 'concentrationInput') {
        setManualStep('medicationSource');
      } else if (manualStep === 'totalAmountInput') {
        setManualStep('concentrationInput');
      } else if (manualStep === 'reconstitution') {
        setManualStep('totalAmountInput');
      } else if (manualStep === 'syringe') {
        setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'totalAmountInput');
      } else if (manualStep === 'finalResult') {
        setManualStep('syringe');
      }
      setFormError(null);
      lastActionTimestamp.current = Date.now();
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleBack:', error);
      // If back navigation fails, try to recover by going to intro
      resetFullForm();
      setScreenStep('intro');
    }
  }, [manualStep, medicationInputType, resetFullForm]);

  const handleStartOver = useCallback(() => {
    resetFullForm();
    setScreenStep('intro');
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm();
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  const handleCapture = useCallback(async () => {
    try {
      const canProceed = await checkUsageLimit();
      if (!canProceed) {
        return false;
      }
      // Simulate scan processing (actual logic in ScanScreen)
      setManualStep('dose');
      lastActionTimestamp.current = Date.now();
      return true;
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCapture:', error);
      return false;
    }
  }, [checkUsageLimit]);

  // Check for stale state (no activity for 10+ minutes) and reset if needed
  useEffect(() => {
    const checkStateHealth = () => {
      const now = Date.now();
      const timeSinceLastAction = now - lastActionTimestamp.current;
      
      // If it's been more than 10 minutes since the last action, reset state
      if (timeSinceLastAction > 10 * 60 * 1000) {
        console.log('[useDoseCalculator] Detected stale state, resetting');
        resetFullForm();
        setScreenStep('intro');
        setStateHealth('recovering');
      }
    };
    
    // Check state health every minute
    const intervalId = setInterval(checkStateHealth, 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [resetFullForm]);

  // Make sure screen step changes reset related state appropriately
  useEffect(() => {
    console.log('[useDoseCalculator] Screen step changed:', screenStep);
    if (screenStep === 'intro') {
      // When returning to intro, make sure form state is clean
      // But don't reset if we're already at intro step (prevents loops)
      if (manualStep !== 'dose') {
        resetFullForm();
      }
    }
  }, [screenStep, manualStep, resetFullForm]);

  const result = {
    screenStep,
    // Replace setScreenStep with the safe version
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
    setManualSyringe: (syringe: Syringe | string) => {
      try {
        const volume = typeof syringe === 'string' ? syringe : syringe.volume;
        setManualSyringe(volume);
        lastActionTimestamp.current = Date.now();
      } catch (error) {
        console.error('[useDoseCalculator] Error in setManualSyringe:', error);
        setManualSyringe('1mL'); // Fallback to default
      }
    },
    doseValue,
    setDoseValue,
    concentration,
    setConcentration,
    calculatedVolume,
    setCalculatedVolume,
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
  };

  console.log('useDoseCalculator return:', Object.keys(result));
  return result;
}