import React from 'react';
import DoseCalculator from './DoseCalculator';

/**
 * Test file to validate PropTypes functionality for DoseCalculator component
 * This file demonstrates various prop validation scenarios
 */

// Test component with minimal required props
const MinimalExample = () => {
  const [dose, setDose] = React.useState('');
  const [unit, setUnit] = React.useState('mg');
  const [substanceName, setSubstanceName] = React.useState('');
  const [medicationInputType, setMedicationInputType] = React.useState(null);
  const [concentrationAmount, setConcentrationAmount] = React.useState('');
  const [concentrationUnit, setConcentrationUnit] = React.useState('mg/ml');
  const [totalAmount, setTotalAmount] = React.useState('');
  const [solutionVolume, setSolutionVolume] = React.useState('');
  const [manualSyringe, setManualSyringe] = React.useState({
    type: 'Standard',
    volume: '3 ml'
  });
  const [substanceNameHint, setSubstanceNameHint] = React.useState(null);
  const [concentrationHint, setConcentrationHint] = React.useState(null);
  const [totalAmountHint, setTotalAmountHint] = React.useState(null);
  const [syringeHint, setSyringeHint] = React.useState(null);

  return (
    <DoseCalculator
      dose={dose}
      setDose={setDose}
      unit={unit}
      setUnit={setUnit}
      substanceName={substanceName}
      setSubstanceName={setSubstanceName}
      medicationInputType={medicationInputType}
      setMedicationInputType={setMedicationInputType}
      concentrationAmount={concentrationAmount}
      setConcentrationAmount={setConcentrationAmount}
      concentrationUnit={concentrationUnit}
      setConcentrationUnit={setConcentrationUnit}
      totalAmount={totalAmount}
      setTotalAmount={setTotalAmount}
      solutionVolume={solutionVolume}
      setSolutionVolume={setSolutionVolume}
      manualSyringe={manualSyringe}
      setManualSyringe={setManualSyringe}
      substanceNameHint={substanceNameHint}
      setSubstanceNameHint={setSubstanceNameHint}
      concentrationHint={concentrationHint}
      setConcentrationHint={setConcentrationHint}
      totalAmountHint={totalAmountHint}
      setTotalAmountHint={setTotalAmountHint}
      syringeHint={syringeHint}
      setSyringeHint={setSyringeHint}
    />
  );
};

// Test component with invalid props (will trigger PropTypes warnings in development)
const InvalidPropsExample = () => {
  return (
    <DoseCalculator
      // Missing required props - will trigger warnings
      // Invalid prop types - will trigger warnings
      dose={123} // Should be string
      unit="invalid-unit" // Should be one of the valid units
      manualSyringe="invalid" // Should be an object with specific shape
      currentStep="invalid-step" // Should be one of the valid steps
    />
  );
};

// Test component with complete valid props
const CompleteExample = () => {
  const [dose, setDose] = React.useState('100');
  const [unit, setUnit] = React.useState('mg');
  const [substanceName, setSubstanceName] = React.useState('Insulin');
  const [medicationInputType, setMedicationInputType] = React.useState('concentration');
  const [concentrationAmount, setConcentrationAmount] = React.useState('100');
  const [concentrationUnit, setConcentrationUnit] = React.useState('mg/ml');
  const [totalAmount, setTotalAmount] = React.useState('1000');
  const [solutionVolume, setSolutionVolume] = React.useState('10');
  const [manualSyringe, setManualSyringe] = React.useState({
    type: 'Insulin',
    volume: '1 ml'
  });
  const [substanceNameHint, setSubstanceNameHint] = React.useState('Enter medication name');
  const [concentrationHint, setConcentrationHint] = React.useState('Check vial label');
  const [totalAmountHint, setTotalAmountHint] = React.useState('Total in vial');
  const [syringeHint, setSyringeHint] = React.useState('Select appropriate syringe');

  const handleCalculate = () => {
    console.log('Calculate pressed');
  };

  const handleReset = () => {
    console.log('Reset pressed');
  };

  const handleComplete = () => {
    console.log('Complete pressed');
  };

  const handleStepChange = (step) => {
    console.log('Step changed to:', step);
  };

  const validateDose = (dose, unit) => {
    return dose && !isNaN(parseFloat(dose)) && parseFloat(dose) > 0;
  };

  const validateConcentration = (amount, unit) => {
    return amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;
  };

  return (
    <DoseCalculator
      dose={dose}
      setDose={setDose}
      unit={unit}
      setUnit={setUnit}
      substanceName={substanceName}
      setSubstanceName={setSubstanceName}
      medicationInputType={medicationInputType}
      setMedicationInputType={setMedicationInputType}
      concentrationAmount={concentrationAmount}
      setConcentrationAmount={setConcentrationAmount}
      concentrationUnit={concentrationUnit}
      setConcentrationUnit={setConcentrationUnit}
      totalAmount={totalAmount}
      setTotalAmount={setTotalAmount}
      solutionVolume={solutionVolume}
      setSolutionVolume={setSolutionVolume}
      manualSyringe={manualSyringe}
      setManualSyringe={setManualSyringe}
      doseValue={100}
      calculatedVolume={1.0}
      calculatedConcentration={100}
      recommendedMarking="1.0 mL"
      calculationError={null}
      formError={null}
      substanceNameHint={substanceNameHint}
      setSubstanceNameHint={setSubstanceNameHint}
      concentrationHint={concentrationHint}
      setConcentrationHint={setConcentrationHint}
      totalAmountHint={totalAmountHint}
      setTotalAmountHint={setTotalAmountHint}
      syringeHint={syringeHint}
      setSyringeHint={setSyringeHint}
      currentStep="dose"
      onStepChange={handleStepChange}
      validateDoseInput={validateDose}
      validateConcentrationInput={validateConcentration}
      onCalculate={handleCalculate}
      onReset={handleReset}
      onComplete={handleComplete}
      isLoading={false}
      showValidation={true}
      theme="light"
    />
  );
};

export { MinimalExample, InvalidPropsExample, CompleteExample };
export default MinimalExample;