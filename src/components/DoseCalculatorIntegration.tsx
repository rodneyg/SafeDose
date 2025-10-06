/**
 * Integration Example for DoseCalculator Component
 * 
 * This file demonstrates how the new DoseCalculator component with PropTypes
 * validation can be integrated into the existing SafeDose application.
 */

import React from 'react';
import DoseCalculator from './DoseCalculator';

/**
 * Example integration of DoseCalculator with the existing useDoseCalculator hook
 * This shows how the component could be used in place of or alongside ManualEntryScreen
 */
const IntegratedDoseCalculatorExample = () => {
  // These would come from the useDoseCalculator hook in a real implementation
  const [dose, setDose] = React.useState('');
  const [unit, setUnit] = React.useState<'mg' | 'mcg' | 'units' | 'mL'>('mg');
  const [substanceName, setSubstanceName] = React.useState('');
  const [medicationInputType, setMedicationInputType] = React.useState<'concentration' | 'totalAmount' | null>(null);
  const [concentrationAmount, setConcentrationAmount] = React.useState('');
  const [concentrationUnit, setConcentrationUnit] = React.useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
  const [totalAmount, setTotalAmount] = React.useState('');
  const [solutionVolume, setSolutionVolume] = React.useState('');
  const [manualSyringe, setManualSyringe] = React.useState({
    type: 'Standard' as 'Insulin' | 'Standard',
    volume: '3 ml'
  });
  
  // Calculated values (would come from dose calculation logic)
  const [doseValue, setDoseValue] = React.useState<number | null>(null);
  const [calculatedVolume, setCalculatedVolume] = React.useState<number | null>(null);
  const [calculatedConcentration, setCalculatedConcentration] = React.useState<number | null>(null);
  const [recommendedMarking, setRecommendedMarking] = React.useState<string | null>(null);
  
  // Error states
  const [calculationError, setCalculationError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  
  // Hint states
  const [substanceNameHint, setSubstanceNameHint] = React.useState<string | null>(null);
  const [concentrationHint, setConcentrationHint] = React.useState<string | null>(null);
  const [totalAmountHint, setTotalAmountHint] = React.useState<string | null>(null);
  const [syringeHint, setSyringeHint] = React.useState<string | null>(null);
  
  // Step management
  const [currentStep, setCurrentStep] = React.useState<'dose' | 'medicationSource' | 'concentrationInput' | 'totalAmountInput' | 'reconstitution' | 'syringe' | 'preDoseConfirmation' | 'finalResult'>('dose');

  // Validation functions
  const validateDoseInput = (dose: string, unit: 'mg' | 'mcg' | 'units' | 'mL'): boolean => {
    const numericValue = parseFloat(dose);
    return !isNaN(numericValue) && numericValue > 0;
  };

  const validateConcentrationInput = (amount: string, unit: 'mg/ml' | 'mcg/ml' | 'units/ml'): boolean => {
    const numericValue = parseFloat(amount);
    return !isNaN(numericValue) && numericValue > 0;
  };

  // Event handlers
  const handleCalculate = () => {
    console.log('Performing dose calculation...');
    // This would trigger the actual dose calculation logic
    // from lib/doseUtils.ts calculateDose function
  };

  const handleReset = () => {
    console.log('Resetting form...');
    setDose('');
    setSubstanceName('');
    setConcentrationAmount('');
    setTotalAmount('');
    setSolutionVolume('');
    setCalculationError(null);
    setFormError(null);
    setCurrentStep('dose');
  };

  const handleComplete = () => {
    console.log('Completing dose calculation...');
    // This would handle completion logic, like saving the dose
    // or navigating to the next screen
  };

  const handleStepChange = (step: string) => {
    console.log('Step changed to:', step);
    setCurrentStep(step as any);
  };

  return (
    <DoseCalculator
      // Basic dose input props
      dose={dose}
      setDose={setDose}
      unit={unit}
      setUnit={setUnit}
      
      // Substance/medication props
      substanceName={substanceName}
      setSubstanceName={setSubstanceName}
      
      // Medication source configuration
      medicationInputType={medicationInputType}
      setMedicationInputType={setMedicationInputType}
      
      // Concentration input props
      concentrationAmount={concentrationAmount}
      setConcentrationAmount={setConcentrationAmount}
      concentrationUnit={concentrationUnit}
      setConcentrationUnit={setConcentrationUnit}
      
      // Total amount input props
      totalAmount={totalAmount}
      setTotalAmount={setTotalAmount}
      solutionVolume={solutionVolume}
      setSolutionVolume={setSolutionVolume}
      
      // Syringe configuration
      manualSyringe={manualSyringe}
      setManualSyringe={setManualSyringe}
      
      // Calculated values
      doseValue={doseValue}
      calculatedVolume={calculatedVolume}
      calculatedConcentration={calculatedConcentration}
      recommendedMarking={recommendedMarking}
      
      // Error handling
      calculationError={calculationError}
      formError={formError}
      
      // Hint messages
      substanceNameHint={substanceNameHint}
      setSubstanceNameHint={setSubstanceNameHint}
      concentrationHint={concentrationHint}
      setConcentrationHint={setConcentrationHint}
      totalAmountHint={totalAmountHint}
      setTotalAmountHint={setTotalAmountHint}
      syringeHint={syringeHint}
      setSyringeHint={setSyringeHint}
      
      // Step management
      currentStep={currentStep}
      onStepChange={handleStepChange}
      
      // Validation functions
      validateDoseInput={validateDoseInput}
      validateConcentrationInput={validateConcentrationInput}
      
      // Action handlers
      onCalculate={handleCalculate}
      onReset={handleReset}
      onComplete={handleComplete}
      
      // Configuration
      isLoading={false}
      showValidation={true}
      theme="auto"
    />
  );
};

/**
 * Example showing integration with the existing useDoseCalculator hook
 * This demonstrates how the PropTypes validation would work in practice
 */
const UseDoseCalculatorIntegration = ({ 
  checkUsageLimit, 
  trackInteraction 
}: { 
  checkUsageLimit: () => Promise<boolean>; 
  trackInteraction?: () => void; 
}) => {
  // In a real implementation, this would use the actual useDoseCalculator hook:
  // const doseCalculator = useDoseCalculator({ checkUsageLimit, trackInteraction });
  
  // For demonstration, we'll simulate the hook's return values
  const mockDoseCalculator = {
    dose: '100',
    setDose: (value: string) => console.log('setDose:', value),
    unit: 'mg' as const,
    setUnit: (value: 'mg' | 'mcg' | 'units' | 'mL') => console.log('setUnit:', value),
    substanceName: 'Insulin',
    setSubstanceName: (value: string) => console.log('setSubstanceName:', value),
    medicationInputType: 'concentration' as const,
    setMedicationInputType: (value: 'concentration' | 'totalAmount' | null) => console.log('setMedicationInputType:', value),
    concentrationAmount: '100',
    setConcentrationAmount: (value: string) => console.log('setConcentrationAmount:', value),
    concentrationUnit: 'mg/ml' as const,
    setConcentrationUnit: (value: 'mg/ml' | 'mcg/ml' | 'units/ml') => console.log('setConcentrationUnit:', value),
    totalAmount: '1000',
    setTotalAmount: (value: string) => console.log('setTotalAmount:', value),
    solutionVolume: '10',
    setSolutionVolume: (value: string) => console.log('setSolutionVolume:', value),
    manualSyringe: { type: 'Insulin' as const, volume: '1 ml' },
    setManualSyringe: (value: { type: 'Insulin' | 'Standard'; volume: string }) => console.log('setManualSyringe:', value),
    doseValue: 100,
    calculatedVolume: 1.0,
    calculatedConcentration: 100,
    recommendedMarking: '1.0 mL',
    calculationError: null,
    formError: null,
    substanceNameHint: null,
    setSubstanceNameHint: (value: string | null) => console.log('setSubstanceNameHint:', value),
    concentrationHint: null,
    setConcentrationHint: (value: string | null) => console.log('setConcentrationHint:', value),
    totalAmountHint: null,
    setTotalAmountHint: (value: string | null) => console.log('setTotalAmountHint:', value),
    syringeHint: null,
    setSyringeHint: (value: string | null) => console.log('setSyringeHint:', value),
    currentStep: 'finalResult' as const,
  };

  return (
    <DoseCalculator
      {...mockDoseCalculator}
      onStepChange={(step) => console.log('Step changed:', step)}
      validateDoseInput={(dose, unit) => !isNaN(parseFloat(dose)) && parseFloat(dose) > 0}
      validateConcentrationInput={(amount, unit) => !isNaN(parseFloat(amount)) && parseFloat(amount) > 0}
      onCalculate={() => console.log('Calculate triggered')}
      onReset={() => console.log('Reset triggered')}
      onComplete={() => console.log('Complete triggered')}
      isLoading={false}
      showValidation={true}
      theme="light"
    />
  );
};

export { IntegratedDoseCalculatorExample, UseDoseCalculatorIntegration };
export default IntegratedDoseCalculatorExample;