import { useState, useCallback, useMemo } from 'react';

export interface ReconstitutionPlannerParams {
  peptideAmountMg: number;
  bacWaterMl: number;
  targetDoseMg: number;
}

export interface ReconstitutionPlannerResult {
  concentration: number; // mg/mL
  drawVolume: number; // mL
}

export interface ReconstitutionState {
  step: 'inputMethod' | 'manualInput' | 'scanLabel' | 'output';
  inputMethod: 'manual' | 'scan' | null;
  peptideAmount: string;
  peptideUnit: 'mg' | 'mcg';
  bacWater: string;
  targetDose: string;
  targetDoseUnit: 'mg' | 'mcg';
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
    bacWater: '',
    targetDose: '',
    targetDoseUnit: 'mcg',
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
    const { peptideAmountMg, bacWaterMl, targetDoseMg } = params;

    // Calculate concentration: peptide amount (mg) / total volume (mL)
    const concentration = peptideAmountMg / bacWaterMl;

    // Calculate draw volume: target dose (mg) / concentration (mg/mL)
    const drawVolume = targetDoseMg / concentration;

    return {
      concentration,
      drawVolume,
    };
  }, []);

  // Get current calculation result
  const result = useMemo(() => {
    try {
      const peptideAmountValue = parseFloat(state.peptideAmount || state.scannedPeptideAmount || '0');
      const bacWaterValue = parseFloat(state.bacWater);
      const targetDoseValue = parseFloat(state.targetDose);

      if (!peptideAmountValue || !bacWaterValue || !targetDoseValue) {
        return null;
      }

      // Convert peptide amount to mg if needed
      const peptideAmountMg = state.peptideUnit === 'mcg' ? peptideAmountValue / 1000 : peptideAmountValue;
      
      // Convert target dose to mg if needed
      const targetDoseMg = state.targetDoseUnit === 'mcg' ? targetDoseValue / 1000 : targetDoseValue;

      return calculateReconstitution({
        peptideAmountMg,
        bacWaterMl: bacWaterValue,
        targetDoseMg,
      });
    } catch {
      return null;
    }
  }, [state.peptideAmount, state.scannedPeptideAmount, state.peptideUnit, state.bacWater, state.targetDose, state.targetDoseUnit, calculateReconstitution]);

  const validateInputs = useCallback(() => {
    const peptideAmountValue = parseFloat(state.peptideAmount || state.scannedPeptideAmount || '0');
    const bacWaterValue = parseFloat(state.bacWater);
    const targetDoseValue = parseFloat(state.targetDose);

    if (!peptideAmountValue || peptideAmountValue <= 0) {
      setError('Please enter a valid peptide amount greater than 0');
      return false;
    }

    if (!bacWaterValue || bacWaterValue <= 0) {
      setError('Please enter a valid BAC water amount greater than 0');
      return false;
    }

    if (!targetDoseValue || targetDoseValue <= 0) {
      setError('Please enter a valid target dose greater than 0');
      return false;
    }

    // Validate draw volume is reasonable (between 0.001 mL and 5 mL)
    if (result) {
      if (result.drawVolume < 0.001) {
        setError('Target dose is too small - draw volume would be less than 0.001 mL');
        return false;
      }
      if (result.drawVolume > 5) {
        setError('Target dose is too large - draw volume would exceed 5 mL');
        return false;
      }
    }

    return true;
  }, [state.peptideAmount, state.scannedPeptideAmount, state.bacWater, state.targetDose, result, setError]);

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
      bacWater: '',
      targetDose: '',
      targetDoseUnit: 'mcg',
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