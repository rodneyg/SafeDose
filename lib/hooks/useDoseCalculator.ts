import { useState, useCallback, useRef, useEffect } from 'react';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { volume: string };

interface UseDoseCalculatorProps {
  checkUsageLimit: () => Promise<boolean>;
}

export default function useDoseCalculator({ checkUsageLimit }: UseDoseCalculatorProps) {
  // Use a ref to track if this is the first render or a re-render after navigation
  const isInitialized = useRef(false);
  
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
  
  // Make sure resetFullForm is stable and properly typed
  const resetFullForm = useCallback((startStep?: 'dose') => {
    console.log('[useDoseCalculator] Resetting form state', { startStep });
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
    
    // Mark as initialized after first reset
    if (!isInitialized.current) {
      isInitialized.current = true;
    }
  }, []);
  
  // Initialize the hook the first time it's mounted
  useEffect(() => {
    if (!isInitialized.current) {
      console.log('[useDoseCalculator] Initial setup');
      resetFullForm('dose');
    }
  }, [resetFullForm]);

  const handleNextDose = useCallback(() => {
    if (!dose || !unit) {
      setFormError('Please enter a dose and unit');
      return;
    }
    setDoseValue(parseFloat(dose));
    setManualStep('medicationSource');
    setFormError(null);
  }, [dose, unit]);

  const handleNextMedicationSource = useCallback(() => {
    if (!substanceName) {
      setFormError('Please enter a substance name');
      return;
    }
    setManualStep('concentrationInput');
    setFormError(null);
  }, [substanceName]);

  const handleNextConcentrationInput = useCallback(() => {
    if (!concentrationAmount || !concentrationUnit) {
      setFormError('Please enter concentration amount and unit');
      return;
    }
    setConcentration(parseFloat(concentrationAmount));
    setManualStep('totalAmountInput');
    setFormError(null);
  }, [concentrationAmount, concentrationUnit]);

  const handleNextTotalAmountInput = useCallback(() => {
    if (!totalAmount) {
      setFormError('Please enter total amount');
      return;
    }
    setManualStep(medicationInputType === 'solution' ? 'reconstitution' : 'syringe');
    setFormError(null);
  }, [totalAmount, medicationInputType]);

  const handleNextReconstitution = useCallback(() => {
    if (!solutionVolume) {
      setFormError('Please enter solution volume');
      return;
    }
    setManualStep('syringe');
    setFormError(null);
  }, [solutionVolume]);

  const handleCalculateFinal = useCallback(() => {
    if (!doseValue || !concentration || !manualSyringe) {
      setCalculationError('Missing required fields for calculation');
      return;
    }
    try {
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
    } catch (error) {
      setCalculationError('Error calculating dose');
    }
  }, [doseValue, concentration, manualSyringe]);

  const handleBack = useCallback(() => {
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
  }, [manualStep, medicationInputType]);

  const handleStartOver = useCallback(() => {
    resetFullForm();
    setScreenStep('intro');
  }, [resetFullForm]);

  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm();
  }, [resetFullForm]);

  const handleCapture = useCallback(async () => {
    const canProceed = await checkUsageLimit();
    if (!canProceed) {
      return false;
    }
    // Simulate scan processing (actual logic in ScanScreen)
    setManualStep('dose');
    return true;
  }, [checkUsageLimit]);

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
    setScreenStep,
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
      const volume = typeof syringe === 'string' ? syringe : syringe.volume;
      setManualSyringe(volume);
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
  };

  console.log('useDoseCalculator return:', Object.keys(result));
  return result;
}