import React from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';

/**
 * DoseCalculator Component
 * 
 * A component that provides dose calculation functionality with comprehensive
 * PropTypes validation for enhanced type checking during development.
 */
const DoseCalculator = ({
  // Dose input properties
  dose,
  setDose,
  unit,
  setUnit,
  
  // Substance/medication properties
  substanceName,
  setSubstanceName,
  
  // Medication source configuration
  medicationInputType,
  setMedicationInputType,
  
  // Concentration input properties
  concentrationAmount,
  setConcentrationAmount,
  concentrationUnit,
  setConcentrationUnit,
  
  // Total amount input properties
  totalAmount,
  setTotalAmount,
  solutionVolume,
  setSolutionVolume,
  
  // Syringe configuration
  manualSyringe,
  setManualSyringe,
  
  // Calculated values
  doseValue,
  calculatedVolume,
  calculatedConcentration,
  recommendedMarking,
  
  // Error handling
  calculationError,
  formError,
  
  // Hint messages
  substanceNameHint,
  setSubstanceNameHint,
  concentrationHint,
  setConcentrationHint,
  totalAmountHint,
  setTotalAmountHint,
  syringeHint,
  setSyringeHint,
  
  // Step management
  currentStep,
  onStepChange,
  
  // Validation functions
  validateDoseInput,
  validateConcentrationInput,
  
  // Action handlers
  onCalculate,
  onReset,
  onComplete,
  
  // Optional configuration
  isLoading,
  showValidation,
  theme,
}) => {
  // Component would render the dose calculation UI here
  // This is a minimal implementation to demonstrate the PropTypes structure
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dose Calculator</Text>
      {calculationError && (
        <Text style={styles.error}>{calculationError}</Text>
      )}
      {formError && (
        <Text style={styles.error}>{formError}</Text>
      )}
      <Text style={styles.info}>
        Current Step: {currentStep || 'none'}
      </Text>
      <Text style={styles.info}>
        Dose: {dose || 'not set'} {unit}
      </Text>
      <Text style={styles.info}>
        Substance: {substanceName || 'not set'}
      </Text>
      {calculatedVolume && (
        <Text style={styles.result}>
          Calculated Volume: {calculatedVolume} mL
        </Text>
      )}
    </View>
  );
};

// Comprehensive PropTypes validation
DoseCalculator.propTypes = {
  // Dose input properties
  dose: PropTypes.string,
  setDose: PropTypes.func.isRequired,
  unit: PropTypes.oneOf(['mg', 'mcg', 'units', 'mL']),
  setUnit: PropTypes.func.isRequired,
  
  // Substance/medication properties
  substanceName: PropTypes.string,
  setSubstanceName: PropTypes.func.isRequired,
  
  // Medication source configuration
  medicationInputType: PropTypes.oneOf(['concentration', 'totalAmount', null]),
  setMedicationInputType: PropTypes.func.isRequired,
  
  // Concentration input properties
  concentrationAmount: PropTypes.string,
  setConcentrationAmount: PropTypes.func.isRequired,
  concentrationUnit: PropTypes.oneOf(['mg/ml', 'mcg/ml', 'units/ml']),
  setConcentrationUnit: PropTypes.func.isRequired,
  
  // Total amount input properties
  totalAmount: PropTypes.string,
  setTotalAmount: PropTypes.func.isRequired,
  solutionVolume: PropTypes.string,
  setSolutionVolume: PropTypes.func.isRequired,
  
  // Syringe configuration
  manualSyringe: PropTypes.shape({
    type: PropTypes.oneOf(['Insulin', 'Standard']).isRequired,
    volume: PropTypes.string.isRequired,
  }),
  setManualSyringe: PropTypes.func.isRequired,
  
  // Calculated values (read-only)
  doseValue: PropTypes.number,
  calculatedVolume: PropTypes.number,
  calculatedConcentration: PropTypes.number,
  recommendedMarking: PropTypes.string,
  
  // Error handling
  calculationError: PropTypes.string,
  formError: PropTypes.string,
  
  // Hint messages
  substanceNameHint: PropTypes.string,
  setSubstanceNameHint: PropTypes.func.isRequired,
  concentrationHint: PropTypes.string,
  setConcentrationHint: PropTypes.func.isRequired,
  totalAmountHint: PropTypes.string,
  setTotalAmountHint: PropTypes.func.isRequired,
  syringeHint: PropTypes.string,
  setSyringeHint: PropTypes.func.isRequired,
  
  // Step management
  currentStep: PropTypes.oneOf([
    'dose',
    'medicationSource',
    'concentrationInput',
    'totalAmountInput',
    'reconstitution',
    'syringe',
    'preDoseConfirmation',
    'finalResult'
  ]),
  onStepChange: PropTypes.func,
  
  // Validation functions
  validateDoseInput: PropTypes.func,
  validateConcentrationInput: PropTypes.func,
  
  // Action handlers
  onCalculate: PropTypes.func,
  onReset: PropTypes.func,
  onComplete: PropTypes.func,
  
  // Optional configuration
  isLoading: PropTypes.bool,
  showValidation: PropTypes.bool,
  theme: PropTypes.oneOf(['light', 'dark', 'auto']),
};

// Default props
DoseCalculator.defaultProps = {
  dose: '',
  unit: 'mg',
  substanceName: '',
  medicationInputType: null,
  concentrationAmount: '',
  concentrationUnit: 'mg/ml',
  totalAmount: '',
  solutionVolume: '',
  manualSyringe: {
    type: 'Standard',
    volume: '3 ml'
  },
  doseValue: null,
  calculatedVolume: null,
  calculatedConcentration: null,
  recommendedMarking: null,
  calculationError: null,
  formError: null,
  substanceNameHint: null,
  concentrationHint: null,
  totalAmountHint: null,
  syringeHint: null,
  currentStep: 'dose',
  onStepChange: null,
  validateDoseInput: null,
  validateConcentrationInput: null,
  onCalculate: null,
  onReset: null,
  onComplete: null,
  isLoading: false,
  showValidation: true,
  theme: 'auto',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
    color: '#6b7280',
  },
  result: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    color: '#059669',
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
});

export default DoseCalculator;