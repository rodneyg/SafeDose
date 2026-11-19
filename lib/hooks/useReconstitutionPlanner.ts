import { calculateReconstitution, getReconstitutionResult, getReconstitutionInputError } from '../dosing';
export type { ReconstitutionPlannerParams, ReconstitutionPlannerResult } from '../dosing';
import { useState, useCallback, useMemo } from 'react';

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

  const result = useMemo(() => getReconstitutionResult(state), [state.peptideAmount, state.scannedPeptideAmount, state.peptideUnit, state.targetDose, state.targetDoseUnit, state.preferredVolume]);

  const validateInputs = useCallback(() => {
    const error = getReconstitutionInputError(state, result);
    if (error) {
      setError(error);
      return false;
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