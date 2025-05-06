import { useState } from 'react';
import { syringeOptions } from '../../lib/utils';

type ManualEntryStep = 'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'finalResult';
type MedicationInputType = 'concentration' | 'totalAmount' | null;

export default function useDoseCalculator(calculateDose: () => void) {
  const [screenStep, setScreenStep] = useState<'intro' | 'scan' | 'manualEntry'>('intro');
  const [manualStep, setManualStep] = useState<ManualEntryStep>('dose');
  const [dose, setDose] = useState<string>('');
  const [unit, setUnit] = useState<'mg' | 'mcg' | 'units'>('mg');
  const [substanceName, setSubstanceName] = useState<string>('');
  const [medicationInputType, setMedicationInputType] = useState<MedicationInputType>('concentration');
  const [concentrationAmount, setConcentrationAmount] = useState<string>('');
  const [concentrationUnit, setConcentrationUnit] = useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [solutionVolume, setSolutionVolume] = useState<string>('1');
  const [manualSyringe, setManualSyringe] = useState<{ type: 'Insulin' | 'Standard'; volume: string }>({ type: 'Standard', volume: '3 ml' });
  const [doseValue, setDoseValue] = useState<number | null>(null);
  const [concentration, setConcentration] = useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = useState<string | null>(null);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [substanceNameHint, setSubstanceNameHint] = useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = useState<string | null>(null);
  const [syringeHint, setSyringeHint] = useState<string | null>(null);

  const resetFullForm = (startStep: ManualEntryStep = 'dose') => {
    setDose('');
    setUnit('mg');
    setSubstanceName('');
    setMedicationInputType('concentration');
    setConcentrationAmount('');
    setConcentrationUnit('mg/ml');
    setTotalAmount('');
    setSolutionVolume('1');
    setManualSyringe({ type: 'Standard', volume: '3 ml' });
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
    console.log('[Reset] Form reset complete');
  };

  const handleNextDose = () => {
    setFormError(null);
    const parsedDose = parseFloat(dose);
    if (!dose || isNaN(parsedDose) || parsedDose <= 0) {
      setFormError('Please enter a valid, positive dose amount.');
      return;
    }
    setDoseValue(parsedDose);
    setManualStep('medicationSource');
    console.log('[Navigation] Moving to medicationSource');
  };

  const handleNextMedicationSource = () => {
    setFormError(null);
    if (!medicationInputType) {
      setFormError('Please select how the medication amount is specified.');
      return;
    }
    setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
    console.log('[Navigation] Moving to', medicationInputType === 'concentration' ? 'concentrationInput' : 'totalAmountInput');
  };

  const handleNextConcentrationInput = () => {
    setFormError(null);
    const parsedConc = parseFloat(concentrationAmount);
    if (!concentrationAmount || isNaN(parsedConc) || parsedConc <= 0) {
      setFormError('Please enter a valid, positive concentration amount.');
      return;
    }
    const expectedUnit = unit + '/ml';
    if (concentrationUnit !== expectedUnit) {
      setFormError(`Unit mismatch: Dose is in '${unit}', but concentration unit is '${concentrationUnit}'. Please use '${expectedUnit}'.`);
      return;
    }
    setConcentration(parsedConc);
    if (unit === 'units' || unit === 'mcg') {
      setManualSyringe({ type: 'Insulin', volume: '1 ml' });
      setSyringeHint(unit === 'units' ? 'Insulin syringe suggested due to units.' : 'Insulin syringe suggested due to micrograms.');
    } else {
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSyringeHint('Standard syringe selected for milligrams.');
    }
    setManualStep('syringe');
    console.log('[Navigation] Moving to syringe with concentration:', parsedConc);
  };

  const handleNextTotalAmountInput = () => {
    setFormError(null);
    const parsedAmount = parseFloat(totalAmount);
    if (!totalAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid, positive number for the total amount.');
      return;
    }
    setManualStep('reconstitution');
    console.log('[Navigation] Moving to reconstitution');
  };

  const handleNextReconstitution = () => {
    setFormError(null);
    const parsedSolutionVol = parseFloat(solutionVolume);
    if (!solutionVolume || isNaN(parsedSolutionVol) || parsedSolutionVol <= 0) {
      setFormError('Please enter a valid, positive volume (in ml) added for reconstitution.');
      return;
    }
    let totalAmountValue = parseFloat(totalAmount);
    if (unit === 'mcg') {
      totalAmountValue *= 1000;
    }
    const calculatedConc = totalAmountValue / parsedSolutionVol;
    setConcentration(calculatedConc);
    if (unit === 'units' || unit === 'mcg') {
      setManualSyringe({ type: 'Insulin', volume: '1 ml' });
      setSyringeHint(unit === 'units' ? 'Insulin syringe suggested due to units.' : 'Insulin syringe suggested due to micrograms.');
    } else {
      setManualSyringe({ type: 'Standard', volume: '3 ml' });
      setSyringeHint('Standard syringe selected for milligrams.');
    }
    setManualStep('syringe');
    console.log('[Navigation] Moving to syringe with calculated concentration:', calculatedConc);
  };

  const handleCalculateFinal = () => {
    setFormError(null);
    calculateDose();
    setManualStep('finalResult');
    console.log('[Navigation] Moving to finalResult');
  };

  const handleBack = () => {
    setCalculationError(null);
    setFormError(null);
    switch (manualStep) {
      case 'finalResult': setManualStep('syringe'); break;
      case 'syringe': setManualStep(medicationInputType === 'concentration' ? 'concentrationInput' : 'reconstitution'); break;
      case 'reconstitution': setManualStep('totalAmountInput'); break;
      case 'concentrationInput':
      case 'totalAmountInput': setManualStep('medicationSource'); break;
      case 'medicationSource': setManualStep('dose'); break;
      case 'dose': setScreenStep('intro'); resetFullForm(); break;
    }
    console.log('[Navigation] Going back to', manualStep);
  };

  const handleStartOver = () => {
    resetFullForm('dose');
    console.log('[Navigation] Starting over');
  };

  const handleGoHome = () => {
    resetFullForm();
    setScreenStep('intro');
    console.log('[Navigation] Going home');
  };

  return {
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
    setManualSyringe,
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
  };
}