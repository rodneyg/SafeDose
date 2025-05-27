import { useState, useCallback, useRef, useEffect } from 'react';

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

export default function useDoseCalculator({ checkUsageLimit }: UseDoseCalculatorProps) {
  const isInitialized = useRef(false);
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
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' });
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [calculatedConcentration, setCalculatedConcentration] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<number | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [precisionNote, setPrecisionNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);
  const [stateHealth, setStateHealth] = useState<'healthy' | 'recovering'>('healthy');

  const resetFullForm = useCallback((startStep: ManualStep = 'dose') => {
    console.log('[useDoseCalculator] Resetting form state', { startStep });
    lastActionTimestamp.current = Date.now();

    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('powder');
    setConcentrationAmount('');
    setConcentrationUnit('mg/mL');
    setTotalAmount('');
    setSolutionVolume('');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
    setDoseValue(null);
    setConcentration(null);
    setCalculatedVolume(null);
    setCalculatedConcentration(null);
    setRecommendedMarking(null);
    setCalculationError(null);
    setPrecisionNote(null);
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

  useEffect(() => {
    if (!isInitialized.current) {
      console.log('[useDoseCalculator] Initial setup');
      resetFullForm('dose');
      
      // Ensure we start on intro screen
      setScreenStep('intro');
      console.log('[useDoseCalculator] Initialization complete - screen set to intro');
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
    if (medicationInputType === 'totalAmount') {
      setManualStep('totalAmountInput');
    } else {
      setManualStep('concentrationInput');
    }
    setFormError(null);
  }, [medicationInputType]);

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
      if (!totalAmount || isNaN(parseFloat(totalAmount))) {
        setFormError('Please enter a valid total amount');
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
      console.log('[useDoseCalculator] handleCalculateFinal called');
      
      // Ensure we have all required data before calculation
      if (!doseValue) {
        console.warn('[useDoseCalculator] No doseValue for calculation');
        setCalculationError('Missing dose value. Please check your inputs and try again.');
        setManualStep('finalResult');
        return;
      }
      
      // Safety check for unit and concentrationUnit
      if (!unit || !concentrationUnit) {
        console.warn(`[useDoseCalculator] Missing unit (${unit}) or concentrationUnit (${concentrationUnit})`);
        setCalculationError('Missing unit information. Please check your inputs and try again.');
        setManualStep('finalResult');
        return;
      }
      
      let totalAmountValue = totalAmount ? parseFloat(totalAmount) : null;
      if (unit === 'mcg' && totalAmountValue) {
        totalAmountValue *= 1000;
      }

      // Use the manualSyringe object directly, as it's already in the correct format
      const syringeObj = manualSyringe;

      const { calculateDose } = require('../doseUtils');
      
      console.log('[useDoseCalculator] Performing calculation with:', {
        doseValue,
        concentration,
        unit,
        concentrationUnit,
        totalAmount: totalAmountValue,
        manualSyringe: JSON.stringify(syringeObj),
        solutionVolume
      });
      
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
        calculationError: result.calculationError,
        precisionNote: result.precisionNote
      });

      // Always set ALL calculated values first - ensure we never have partial updates
      setCalculatedVolume(result.calculatedVolume);
      setRecommendedMarking(result.recommendedMarking);
      setCalculationError(result.calculationError);
      setPrecisionNote(result.precisionNote);
      setCalculatedConcentration(result.calculatedConcentration || null);
      
      // Always navigate to finalResult screen after setting all values
      setManualStep('finalResult');
      console.log('[useDoseCalculator] Set manualStep to finalResult');
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      // Make sure all result values are set, even on error
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
      setRecommendedMarking(null);
      setPrecisionNote(null);
      setCalculatedVolume(null);
      setCalculatedConcentration(null);
      
      // Ensure we still navigate to the results screen even if there's an error
      setManualStep('finalResult');
      console.log('[useDoseCalculator] Set manualStep to finalResult (after error)');
    }
  }, [doseValue, concentration, manualSyringe, unit, totalAmount, concentrationUnit, solutionVolume]);

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

  const handleStartOver = useCallback(() => {
    resetFullForm('dose');
    setScreenStep('intro');
    lastActionTimestamp.current = Date.now();
  }, [resetFullForm]);

  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm('dose');
  }, [resetFullForm]);

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
    precisionNote,
    setPrecisionNote,
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
}