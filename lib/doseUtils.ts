import { syringeOptions } from '../lib/utils';

/**
 * Validates if the dose unit is compatible with the concentration unit
 * 
 * This function determines whether a given dose unit can be used with a specific concentration unit.
 * It handles special cases like:
 * 1. Volume-based doses (ml) which are compatible with any concentration units
 * 2. Direct unit matches (e.g., units with units/ml)
 * 3. Mass unit conversions (mg can work with mcg/ml and vice versa with proper conversion)
 */
export function validateUnitCompatibility(
  doseUnit: 'mg' | 'mcg' | 'units' | 'ml',
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'
): { isCompatible: boolean; message: string | null } {
  console.log(`[validateUnitCompatibility] Checking ${doseUnit} dose with ${concentrationUnit} concentration`);
  
  // Volume-based doses (ml) are compatible with any concentration units
  if (doseUnit === 'ml') {
    console.log('[validateUnitCompatibility] Volume-based dose is compatible with any concentration');
    return { isCompatible: true, message: null };
  }

  // Handle units directly (for clarity)
  if (doseUnit === 'units' && concentrationUnit === 'units/ml') {
    console.log('[validateUnitCompatibility] Units dose with units/ml concentration is compatible');
    return { isCompatible: true, message: null };
  }
  
  // Special case: mg and mcg are compatible through conversion
  // This is a key part of the fix - ensuring mcg doses work with mg/ml concentrations and vice versa
  if ((doseUnit === 'mg' && concentrationUnit === 'mcg/ml') || 
      (doseUnit === 'mcg' && concentrationUnit === 'mg/ml')) {
    console.log('[validateUnitCompatibility] Mass units with different scales are compatible through conversion');
    return { isCompatible: true, message: null };
  }
  
  // For non-volume doses, get the unit base - but this is just for display purposes
  // The actual compatibility is determined by more specific rules above
  const doseUnitBase = doseUnit.replace('mcg', 'mg');
  const concUnitBase = concentrationUnit.split('/')[0].replace('mcg', 'mg');
  console.log(`[validateUnitCompatibility] Comparing unit bases: ${doseUnitBase} vs ${concUnitBase}`);

  // The bases must match (mg with mg, mcg with mcg, units with units)
  if (doseUnitBase === concUnitBase) {
    console.log('[validateUnitCompatibility] Unit bases match, compatible');
    return { isCompatible: true, message: null };
  }

  console.log('[validateUnitCompatibility] Units are not compatible');
  return {
    isCompatible: false,
    message: `Unit mismatch between dose (${doseUnit}) and concentration (${concentrationUnit}).`
  };
}

interface CalculateDoseParams {
  doseValue: number | null;
  concentration: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'ml';
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number | null;  // Total amount in vial
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string } | null;
  solutionVolume?: string | null; // Added solution volume for concentration calculation
}

interface CalculateDoseResult {
  calculatedVolume: number | null;
  recommendedMarking: string | null;
  calculationError: string | null;
  calculatedConcentration?: number | null; // Add calculated concentration for reference
  calculatedMass?: number | null; // Add calculated mass for ml-based doses
  precisionNote?: string | null; // Added for precision warnings that aren't errors
}

export function calculateDose({
  doseValue,
  concentration,
  unit,
  concentrationUnit,
  totalAmount,
  manualSyringe,
  solutionVolume,
}: CalculateDoseParams): CalculateDoseResult {
  console.log('[Calculate] Starting calculation');
  console.log('[Calculate] Input params:', { doseValue, concentration, unit, concentrationUnit, totalAmount, solutionVolume });

  let calculatedVolume: number | null = null;
  let recommendedMarking: string | null = null;
  let calculationError: string | null = null;
  let calculatedConcentration: number | null = null;

  if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
    calculationError = 'Dose value is invalid or missing.';
    console.log('[Calculate] Error: Invalid dose value');
    return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
  }

  // If concentration is missing but totalAmount and solutionVolume are available, calculate concentration
  if ((concentration === null || isNaN(concentration) || concentration <= 0) && 
      totalAmount !== null && totalAmount !== undefined && totalAmount > 0 && 
      solutionVolume !== null && solutionVolume !== undefined && solutionVolume !== '') {
    
    const solVolume = parseFloat(solutionVolume);
    if (!isNaN(solVolume) && solVolume > 0) {
      calculatedConcentration = totalAmount / solVolume;
      concentration = calculatedConcentration;
      console.log(`[Calculate] Calculated concentration from totalAmount ${totalAmount} and solutionVolume ${solVolume}: ${concentration}`);
    }
  }
  
  if (concentration === null || isNaN(concentration) || concentration <= 0) {
    calculationError = 'Concentration is invalid or missing.';
    console.log('[Calculate] Error: Invalid concentration');
    return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
  }

  if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
    calculationError = 'Syringe details are missing.';
    console.log('[Calculate] Error: Missing syringe details');
    return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass };
  }

  const markingsString = syringeOptions[manualSyringe.type][manualSyringe.volume];
  if (!markingsString) {
    calculationError = `Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`;
    console.log('[Calculate] Error: Invalid syringe option');
    return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass };
  }

  let requiredVolume = doseValue / concentration;
  let calculatedMass: number | null = null;
  console.log('[Calculate] Initial required volume (ml):', requiredVolume);

  // If the dose unit is ml, we need to calculate the mass instead of the volume
  if (unit === 'ml') {
    if (concentrationUnit.startsWith('mg/') || concentrationUnit.startsWith('mcg/') || concentrationUnit.startsWith('units/')) {
      calculatedMass = doseValue * concentration;
      console.log('[Calculate] Calculated mass:', calculatedMass, concentrationUnit.split('/')[0]);
      
      // For ml dose, use the dose value directly as volume
      requiredVolume = doseValue;
    } else {
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      calculationError = compatibility.message || 'Unit mismatch between dose and concentration.';
      console.log('[Calculate] Error: Unit mismatch (ml dose with incompatible concentration)');
      return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration, calculatedMass };
    }
  } else if (unit === 'mcg' && concentrationUnit === 'mcg/ml') {
    requiredVolume = doseValue / concentration;
  } else if (unit === 'mg' && concentrationUnit === 'mg/ml') {
    requiredVolume = doseValue / concentration;
  } else if (unit === 'units' && concentrationUnit === 'units/ml') {
    requiredVolume = doseValue / concentration;
  } else if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
    requiredVolume = (doseValue / 1000) / concentration;
  } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
    requiredVolume = (doseValue * 1000) / concentration;
  } else {
    const compatibility = validateUnitCompatibility(unit, concentrationUnit);
    calculationError = compatibility.message || 'Unit mismatch between dose and concentration.';
    console.log('[Calculate] Error: Unit mismatch');
    return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
  }

  console.log('[Calculate] Adjusted required volume (ml):', requiredVolume);
  
  // Validate that the total amount is sufficient for the required dose
  if (totalAmount !== undefined && totalAmount !== null) {
    // Convert units if necessary to make a valid comparison
    let doseInSameUnitAsTotal = doseValue;
    
    if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      // If dose is in mcg but total is in mg, convert dose to mg for comparison
      doseInSameUnitAsTotal = doseValue / 1000;
      console.log(`[Calculate] Converting ${doseValue} mcg to ${doseInSameUnitAsTotal} mg for comparison with total amount`);
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      // If dose is in mg but total is in mcg, convert dose to mcg for comparison
      doseInSameUnitAsTotal = doseValue * 1000;
      console.log(`[Calculate] Converting ${doseValue} mg to ${doseInSameUnitAsTotal} mcg for comparison with total amount`);
    }
    
    // Now compare if the dose exceeds the total amount
    if (doseInSameUnitAsTotal > totalAmount) {
      calculationError = `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${concentrationUnit.split('/')[0]}).`;
      console.log('[Calculate] Error: Dose exceeds total available');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }
    
    // Check if the required volume exceeds what can be made from the total amount
    const maxPossibleVolume = totalAmount / concentration;
    if (requiredVolume > maxPossibleVolume) {
      calculationError = `Required volume (${requiredVolume.toFixed(2)} ml) exceeds what can be made from available medication (${maxPossibleVolume.toFixed(2)} ml).`;
      console.log('[Calculate] Error: Required volume exceeds possible volume from total');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }
  }

  calculatedVolume = requiredVolume;

  const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
  if (requiredVolume > maxVolume) {
    calculationError = `Required volume (${requiredVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`;
    console.log('[Calculate] Error: Volume exceeds capacity');
    return { calculatedVolume, recommendedMarking: null, calculationError, calculatedConcentration, calculatedMass };
  }

  const markings = markingsString.split(',').map(m => parseFloat(m));
  const markingScaleValue = manualSyringe.type === 'Insulin' ? requiredVolume * 100 : requiredVolume;
  console.log('[Calculate] Marking scale value:', markingScaleValue);

  const nearestMarking = markings.reduce((prev, curr) =>
    Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
  );
  console.log('[Calculate] Nearest marking:', nearestMarking);

  let precisionMessage = null;
  if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
    const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
    precisionMessage = `Calculated dose is ${markingScaleValue.toFixed(2)} ${unitLabel}. Nearest mark is ${nearestMarking} ${unitLabel}.`;
  }

  recommendedMarking = nearestMarking.toString();
  console.log('[Calculate] Set recommended marking:', recommendedMarking);

  // Even if we have a precision message, don't set it as an error
  // Instead, return both the calculated result AND the message
  let precisionNote = null;
  if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
    const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
    precisionNote = `Calculated dose is ${markingScaleValue.toFixed(2)} ${unitLabel}. Nearest mark is ${nearestMarking} ${unitLabel}.`;
    console.log('[Calculate] Precision note:', precisionNote);
  }

  // Important fix: Return null for calculationError instead of the precision message
  // This allows the calculation to succeed while still showing the precision note
  return { calculatedVolume, recommendedMarking, calculationError: null, calculatedConcentration, calculatedMass, precisionNote };
}