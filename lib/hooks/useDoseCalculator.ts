import { useState, useCallback } from 'react';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { volume: string };
type ResetFullFormFunc = (startStep?: ManualStep) => void;

interface UseDoseCalculatorProps {
  checkUsageLimit: () => Promise<boolean>;
}

export default function useDoseCalculator({ checkUsageLimit }: UseDoseCalculatorProps) {
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

  const resetFullForm = useCallback((startStep: ManualStep = 'dose') => {
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
  }, []);

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
    // Substance name is optional, so we don't need to validate it
    setManualStep('concentrationInput');
    setFormError(null);
  }, []);

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
    resetFullForm('dose');
    setScreenStep('intro');
  }, [resetFullForm]);

  const handleGoHome = useCallback(() => {
    setScreenStep('intro');
    resetFullForm('dose');
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