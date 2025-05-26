import { useState, useCallback } from 'react';

type ScreenStep = 'intro' | 'scan' | 'manualEntry';
type ManualStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type Syringe = { volume: string };

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

  const resetFullForm = useCallback(() => {
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
    setManualStep('dose');
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
      // Convert totalAmount to number if it exists
      let totalAmountValue = totalAmount ? parseFloat(totalAmount) : null;
      
      // If dose is in mcg and we're showing total amount in mg in the UI (as per TotalAmountInputStep.tsx),
      // we need to adjust the total amount unit for proper comparison
      if (unit === 'mcg' && totalAmountValue) {
        // Convert from mg to mcg as that's what the user entered (the UI shows mg but we need mcg for calculation)
        totalAmountValue = totalAmountValue * 1000;
      }

      const syringeObj = {
        type: manualSyringe.includes('Insulin') ? 'Insulin' : 'Standard',
        volume: manualSyringe.replace('Insulin ', '')
      };
      
      // Import and use the calculateDose function from doseUtils.ts
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
      
      if (!result.calculationError || (result.calculationError && result.recommendedMarking)) {
        setManualStep('finalResult');
      }
    } catch (error) {
      setCalculationError('Error calculating dose');
    }
  }, [doseValue, concentration, manualSyringe, unit, totalAmount, concentrationUnit]);

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