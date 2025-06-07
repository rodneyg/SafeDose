import { useState, useCallback, useMemo } from 'react';

export interface ReconstitutionPlannerParams {
  peptideAmountMg: number;
  targetDoseMg: number;
  preferredVolumeMl: number;
}

export interface ReconstitutionPlannerResult {
  bacWaterToAdd: number; // mL
  concentration: number; // mg/mL
  injectionVolume: number; // mL (actual volume needed per dose)
}

export interface ReconstitutionState {
  step: 'inputMethod' | 'manualInput' | 'scanLabel' | 'output';
  inputMethod: 'manual' | 'scan' | null;
  peptideAmount: string;
  peptideUnit: 'mg' | 'mcg';
  targetDose: string;
  targetDoseUnit: 'mg' | 'mcg';
  preferredVolume: string; // New field for preferred injection volume
  scannedPeptideAmount: string | null;
  isProcessing: boolean;
  error: string | null;
}

export function useReconstitutionPlanner() {
  const [state, setState] = useState<ReconstitutionState>({
    step: 'inputMethod',
    inputMethod: null,
    peptideAmount: '',
    peptideUnit: 'mg',
    targetDose: '',
    targetDoseUnit: 'mcg',
    preferredVolume: '0.1', // Default to 0.1mL
    scannedPeptideAmount: null,
    isProcessing: false,
    error: null,
  });

  const setStep = useCallback((step: ReconstitutionState['step']) => {
    setState(prev => ({ ...prev, step, error: null }));
  }, []);

  const setInputMethod = useCallback((method: 'manual' | 'scan') => {
    setState(prev => ({ 
      ...prev, 
      inputMethod: method,
      step: method === 'manual' ? 'manualInput' : 'scanLabel',
      error: null 
    }));
  }, []);

  const setPeptideAmount = useCallback((amount: string) => {
    setState(prev => ({ ...prev, peptideAmount: amount, error: null }));
  }, []);

  const setPeptideUnit = useCallback((unit: 'mg' | 'mcg') => {
    setState(prev => ({ ...prev, peptideUnit: unit, error: null }));
  }, []);

  const setBacWater = useCallback((water: string) => {
    setState(prev => ({ ...prev, bacWater: water, error: null }));
  }, []);

  const setPreferredVolume = useCallback((volume: string) => {
    setState(prev => ({ ...prev, preferredVolume: volume, error: null }));
  }, []);

  const setTargetDose = useCallback((dose: string) => {
    setState(prev => ({ ...prev, targetDose: dose, error: null }));
  }, []);

  const setTargetDoseUnit = useCallback((unit: 'mg' | 'mcg') => {
    setState(prev => ({ ...prev, targetDoseUnit: unit, error: null }));
  }, []);

  const setScannedPeptideAmount = useCallback((amount: string | null) => {
    setState(prev => ({ ...prev, scannedPeptideAmount: amount, error: null }));
  }, []);

  const setIsProcessing = useCallback((processing: boolean) => {
    setState(prev => ({ ...prev, isProcessing: processing }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Calculate reconstitution values
  const calculateReconstitution = useCallback((params: ReconstitutionPlannerParams): ReconstitutionPlannerResult => {
    const { peptideAmountMg, targetDoseMg, preferredVolumeMl } = params;

    // Calculate required concentration: target dose (mg) / preferred volume (mL)
    const requiredConcentration = targetDoseMg / preferredVolumeMl;

    // Calculate BAC water to add: peptide amount (mg) / required concentration (mg/mL)
    const bacWaterToAdd = peptideAmountMg / requiredConcentration;

    // Actual injection volume will be the preferred volume (since we calculated concentration to achieve this)
    const injectionVolume = preferredVolumeMl;

    return {
      bacWaterToAdd,
      concentration: requiredConcentration,
      injectionVolume,
    };
  }, []);

  // Get current calculation result
  const result = useMemo(() => {
    try {
      const peptideAmountValue = parseFloat(state.peptideAmount || state.scannedPeptideAmount || '0');
      const targetDoseValue = parseFloat(state.targetDose);
      const preferredVolumeValue = parseFloat(state.preferredVolume);

      if (!peptideAmountValue || !targetDoseValue || !preferredVolumeValue) {
        return null;
      }

      // Convert peptide amount to mg if needed
      const peptideAmountMg = state.peptideUnit === 'mcg' ? peptideAmountValue / 1000 : peptideAmountValue;
      
      // Convert target dose to mg if needed
      const targetDoseMg = state.targetDoseUnit === 'mcg' ? targetDoseValue / 1000 : targetDoseValue;

      return calculateReconstitution({
        peptideAmountMg,
        targetDoseMg,
        preferredVolumeMl: preferredVolumeValue,
      });
    } catch {
      return null;
    }
  }, [state.peptideAmount, state.scannedPeptideAmount, state.peptideUnit, state.targetDose, state.targetDoseUnit, state.preferredVolume, calculateReconstitution]);

  const validateInputs = useCallback(() => {
    const peptideAmountValue = parseFloat(state.peptideAmount || state.scannedPeptideAmount || '0');
    const targetDoseValue = parseFloat(state.targetDose);
    const preferredVolumeValue = parseFloat(state.preferredVolume);

    if (!peptideAmountValue || peptideAmountValue <= 0) {
      setError('Please enter a valid peptide amount greater than 0');
      return false;
    }

    if (!targetDoseValue || targetDoseValue <= 0) {
      setError('Please enter a valid target dose greater than 0');
      return false;
    }

    if (!preferredVolumeValue || preferredVolumeValue <= 0) {
      setError('Please enter a valid preferred volume greater than 0');
      return false;
    }

    // Validate BAC water amount is reasonable (between 0.1 mL and 20 mL)
    if (result) {
      if (result.bacWaterToAdd < 0.1) {
        setError('Target dose is too low - would require less than 0.1 mL of BAC water');
        return false;
      }
      if (result.bacWaterToAdd > 20) {
        setError('Target dose is too high - would require more than 20 mL of BAC water');
        return false;
      }
    }

    return true;
  }, [state.peptideAmount, state.scannedPeptideAmount, state.targetDose, state.preferredVolume, result, setError]);

  const proceedToOutput = useCallback(() => {
    if (validateInputs()) {
      setStep('output');
    }
  }, [validateInputs, setStep]);

  const reset = useCallback(() => {
    setState({
      step: 'inputMethod',
      inputMethod: null,
      peptideAmount: '',
      peptideUnit: 'mg',
      targetDose: '',
      targetDoseUnit: 'mcg',
      preferredVolume: '0.1',
      scannedPeptideAmount: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    result,
    setStep,
    setInputMethod,
    setPeptideAmount,
    setPeptideUnit,
    setBacWater,
    setPreferredVolume,
    setTargetDose,
    setTargetDoseUnit,
    setScannedPeptideAmount,
    setIsProcessing,
    setError,
    calculateReconstitution,
    validateInputs,
    proceedToOutput,
    reset,
  };
}