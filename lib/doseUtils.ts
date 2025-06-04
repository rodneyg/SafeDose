import { syringeOptions } from '../lib/utils';

// Define specific volume types for better type safety
export type InsulinSyringeVolume = keyof typeof syringeOptions['Insulin'];
export type StandardSyringeVolume = keyof typeof syringeOptions['Standard'];
export type SyringeVolume = InsulinSyringeVolume | StandardSyringeVolume;

export interface ManualSyringe {
  type: 'Insulin' | 'Standard';
  volume: SyringeVolume; // Use the more specific type
}

interface CalculateDoseParams {
  doseValue: number | null;
  concentration: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number | null;  // Total amount in vial
  manualSyringe: ManualSyringe | { type: 'Insulin' | 'Standard'; volume: string } | null; // Allow string for initial state, but cast later
  solutionVolume?: string | null; // Added solution volume for concentration calculation
}

interface CalculateDoseResult {
  calculatedVolume: number | null;
  recommendedMarking: string | null;
  calculationError: string | null;
  calculatedConcentration?: number | null; // Add calculated concentration for reference
}

/**
 * Validates if the dose unit and concentration unit are compatible for calculation
 * @param doseUnit - The unit of the dose
 * @param concentrationUnit - The unit of the concentration
 * @returns An object with isValid boolean and error message if invalid
 */
export function validateUnitCompatibility(
  doseUnit: 'mg' | 'mcg' | 'units' | 'mL',
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml'
): { isValid: boolean; errorMessage?: string } {
  // For mL dose, any concentration unit is valid (direct volume-based dose)
  if (doseUnit === 'mL') {
    return { isValid: true };
  }

  // Direct matches (same unit type)
  if (
    (doseUnit === 'mg' && concentrationUnit === 'mg/ml') ||
    (doseUnit === 'mcg' && concentrationUnit === 'mcg/ml') ||
    (doseUnit === 'units' && concentrationUnit === 'units/ml')
  ) {
    return { isValid: true };
  }

  // Compatible with conversion (mcg to mg or mg to mcg)
  if (
    (doseUnit === 'mcg' && concentrationUnit === 'mg/ml') ||
    (doseUnit === 'mg' && concentrationUnit === 'mcg/ml')
  ) {
    return { isValid: true };
  }

  // All other combinations are invalid
  let errorMessage = `Incompatible units: ${doseUnit} dose cannot be calculated with ${concentrationUnit} concentration.`;
  return { isValid: false, errorMessage };
}

/**
 * Get compatible concentration units for a given dose unit
 * @param doseUnit - The unit of the dose
 * @returns Array of compatible concentration units
 */
export function getCompatibleConcentrationUnits(
  doseUnit: 'mg' | 'mcg' | 'units' | 'mL'
): ('mg/ml' | 'mcg/ml' | 'units/ml')[] {
  switch (doseUnit) {
    case 'mg':
      return ['mg/ml', 'mcg/ml'];
    case 'mcg':
      return ['mcg/ml', 'mg/ml'];
    case 'units':
      return ['units/ml'];
    case 'mL':
      return ['mg/ml', 'mcg/ml', 'units/ml']; // mL as dose works with any concentration unit
    default:
      return ['mg/ml', 'mcg/ml', 'units/ml'];
  }
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

  // Validate inputs
  if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
    calculationError = 'Dose value is invalid or missing.';
    console.log('[Calculate] Error: Invalid dose value');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate unit compatibility before proceeding
  const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
  if (!unitCompatibility.isValid) {
    calculationError = unitCompatibility.errorMessage || 'Unit mismatch between dose and concentration.';
    console.log(`[Calculate] Error: ${calculationError}`);
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
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
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
    calculationError = 'Syringe details are missing.';
    console.log('[Calculate] Error: Missing syringe details');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  let markingsString: string | undefined;

  if (manualSyringe.type === 'Insulin') {
    markingsString = syringeOptions['Insulin'][manualSyringe.volume as InsulinSyringeVolume];
  } else if (manualSyringe.type === 'Standard') {
    markingsString = syringeOptions['Standard'][manualSyringe.volume as StandardSyringeVolume];
  }

  if (!markingsString) {
    calculationError = `Markings unavailable for ${manualSyringe.type} ${String(manualSyringe.volume)} syringe.`;
    console.log('[Calculate] Error: Invalid syringe option or volume for type');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Special case for mL as dose unit (direct volume administration)
  if (unit === 'mL') {
    calculatedVolume = doseValue;
    console.log('[Calculate] Direct volume dose (mL):', calculatedVolume);
  } else {
    // Standard dose calculations with unit conversions when needed
    let requiredVolume = doseValue / concentration;
    console.log('[Calculate] Initial required volume (ml):', requiredVolume);

    if (unit === 'mcg' && concentrationUnit === 'mcg/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mg/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'units' && concentrationUnit === 'units/ml') {
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      requiredVolume = (doseValue / 1000) / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      requiredVolume = (doseValue * 1000) / concentration;
    }

    calculatedVolume = requiredVolume;
    console.log('[Calculate] Adjusted required volume (ml):', requiredVolume);
  }

  // Validate calculated volume against safe thresholds
  if (calculatedVolume !== null && (calculatedVolume < 0.005 || calculatedVolume > 2)) {
    calculationError = "VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.";
    console.log('[Calculate] Error: Calculated volume is outside safe thresholds');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate that the total amount is sufficient for the required dose
  if (totalAmount !== undefined && totalAmount !== null && unit !== 'mL') {
    // Convert units if necessary to make a valid comparison
    let doseInSameUnitAsTotal = doseValue;
    
    if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      // If dose is in mcg but total is in mg, convert dose to mg for comparison
      doseInSameUnitAsTotal = doseValue / 1000;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      // If dose is in mg but total is in mcg, convert dose to mcg for comparison
      doseInSameUnitAsTotal = doseValue * 1000;
    }
    
    // Now compare if the dose exceeds the total amount
    if (doseInSameUnitAsTotal > totalAmount) {
      calculationError = `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${unit === 'mcg' && concentrationUnit === 'mg/ml' ? 'mg' : unit}).`;
      console.log('[Calculate] Error: Dose exceeds total available');
      return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
    }
    
    // Check if the required volume exceeds what can be made from the total amount
    const maxPossibleVolume = totalAmount / concentration;
    if (calculatedVolume > maxPossibleVolume) {
      calculationError = `Required volume (${calculatedVolume.toFixed(2)} ml) exceeds what can be made from available medication (${maxPossibleVolume.toFixed(2)} ml).`;
      console.log('[Calculate] Error: Required volume exceeds possible volume from total');
      return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
    }
  }

  const maxVolume = parseFloat(String(manualSyringe.volume).replace(/[^0-9.]/g, ''));
  if (calculatedVolume > maxVolume) {
    calculationError = `Required volume (${calculatedVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`;
    console.log('[Calculate] Error: Volume exceeds capacity');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  const markings = markingsString.split(',').map((m: string) => parseFloat(m));
  const markingScaleValue = manualSyringe.type === 'Insulin' ? calculatedVolume * 100 : calculatedVolume;
  console.log('[Calculate] Marking scale value:', markingScaleValue);

  const nearestMarking = markings.reduce((prev: number, curr: number) =>
    Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
  );
  console.log('[Calculate] Nearest marking:', nearestMarking);

  // Set recommended marking to the exact calculated value instead of nearest marking
  recommendedMarking = markingScaleValue.toString();
  console.log('[Calculate] Set recommended marking to exact value:', markingScaleValue);

  // Provide guidance when exact dose falls between standard markings
  let precisionMessage = null;
  if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
    const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
    const exactValue = markingScaleValue.toFixed(2);
    const nearestValue = nearestMarking.toString();
    
    // Find the two markings that the exact value falls between
    const sortedMarkings = markings.sort((a, b) => a - b);
    const lowerMark = sortedMarkings.filter(m => m <= markingScaleValue).pop();
    const upperMark = sortedMarkings.find(m => m > markingScaleValue);
    
    if (lowerMark !== undefined && upperMark !== undefined) {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is between the ${lowerMark} ${unitLabel} and ${upperMark} ${unitLabel} marks.`;
    } else if (markingScaleValue < markings[0]) {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is below the first marking at ${markings[0]} ${unitLabel}.`;
    } else {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is above the ${nearestValue} ${unitLabel} mark.`;
    }
  }

  if (precisionMessage) {
    calculationError = precisionMessage;
    console.log('[Calculate] Precision guidance:', precisionMessage);
  }

  return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
}