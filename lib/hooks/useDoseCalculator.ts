import { useState, useCallback, useRef, useEffect } from 'react';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { volume: string };
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
    setManualStep(startStep);
    setStateHealth('healthy');

    if (!isInitialized.current) {
      isInitialized.current = true;
      console.log('[useDoseCalculator] Marked as initialized');
    }
  }, []);

  const safeSetScreenStep = useCallback((step: ScreenStep) => {
    console.log('[useDoseCalculator] Setting screen step to:', step, 'isInitialized:', isInitialized.current);
    try {
      lastActionTimestamp.current = Date.now();
      
      // If we're navigating to a new screen, ensure we're properly initialized
      if ((step === 'scan' || step === 'manualEntry') && !isInitialized.current) {
        console.log('[useDoseCalculator] Initializing state during navigation to:', step);
        isInitialized.current = true;
      }
      
      setScreenStep(step);
    } catch (error) {
      console.error('[useDoseCalculator] Error in safeSetScreenStep:', error);
      resetFullForm();
      setScreenStep('intro');
      setStateHealth('recovering');
    }
  }, [resetFullForm]);

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
    setManualStep('concentrationInput');
    setFormError(null);
  }, []);

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
      let totalAmountValue = totalAmount ? parseFloat(totalAmount) : null;
      if (unit === 'mcg' && totalAmountValue) {
        totalAmountValue *= 1000;
      }

      const syringeObj = {
        type: manualSyringe.includes('Insulin') ? 'Insulin' : 'Standard',
        volume: manualSyringe.replace('Insulin ', '')
      };

      const { calculateDose } = require('../doseUtils');
      const result = calculateDose({
        doseValue,
        concentration,
        unit,
        concentrationUnit,
        totalAmount: totalAmountValue,
        manualSyringe: syringeObj,
      });

      setCalculatedVolume(result.calculatedVolume);
      setRecommendedMarking(result.recommendedMarking);
      setCalculationError(result.calculationError);

      if (!result.calculationError || result.recommendedMarking) {
        setManualStep('finalResult');
      }
    } catch (error) {
      console.error('[useDoseCalculator] Error in handleCalculateFinal:', error);
      setCalculationError('Error calculating dose. Please check your inputs and try again.');
    }
  }, [doseValue, concentration, manualSyringe, unit, totalAmount, concentrationUnit]);

  const handleBack = useCallback(() => {
    try {
      if (manualStep === 'dose') setScreenStep('intro');
      else if (manualStep === 'medicationSource') setManualStep('dose');
      else if (manualStep === 'concentrationInput') setManualStep('medicationSource');
      else if (manualStep === 'totalAmountInput') setManualStep('concentrationInput');
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
    setManualSyringe: (syringe: Syringe | string) => {
      try {
        const volume = typeof syringe === 'string' ? syringe : syringe.volume;
        setManualSyringe(volume);
        lastActionTimestamp.current = Date.now();
      } catch (error) {
        console.error('[useDoseCalculator] Error in setManualSyringe:', error);
        setManualSyringe('1mL');
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
}