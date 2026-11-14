import { syringeOptions } from './syringes';
import { getMarkingGuidance } from './markings';

// Define specific volume types for better type safety
export type InsulinSyringeVolume = keyof typeof syringeOptions['Insulin'];
export type StandardSyringeVolume = keyof typeof syringeOptions['Standard'];
export type SyringeVolume = InsulinSyringeVolume | StandardSyringeVolume;

export interface ManualSyringe {
  type: 'Insulin' | 'Standard';
  volume: SyringeVolume; // Use the more specific type
}

export interface CalculateDoseParams {
  doseValue: number | null;
  concentration: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number | null;  // Total amount in vial
  manualSyringe: ManualSyringe | { type: 'Insulin' | 'Standard'; volume: string } | null; // Allow string for initial state, but cast later
  solutionVolume?: string | null; // Added solution volume for concentration calculation
}

export interface CalculateDoseResult {
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
): { isValid: true } | { isValid: false; errorMessage: string } {
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
  const errorMessage = `Incompatible units: ${doseUnit} dose cannot be calculated with ${concentrationUnit} concentration.`;
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
  let calculatedVolume: number | null = null;
  let recommendedMarking: string | null = null;
  let calculationError: string | null = null;
  let calculatedConcentration: number | null = null;

  // Validate inputs
  if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
    calculationError = 'Dose value is invalid or missing.';
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate unit compatibility before proceeding
  const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
  if (!unitCompatibility.isValid) {
    calculationError = unitCompatibility.errorMessage;
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

      // Validate calculated concentration is reasonable
      if (concentrationUnit === 'mg/ml' && concentration < 0.01) {
        calculationError = `Calculated concentration (${concentration.toFixed(4)} mg/ml) is extremely low. Please verify the total amount (${totalAmount} mg) and solution volume (${solutionVolume} ml) are correct.`;
        return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
      } else if (concentrationUnit === 'mcg/ml' && concentration < 1) {
        calculationError = `Calculated concentration (${concentration.toFixed(4)} mcg/ml) is extremely low. Please verify the total amount (${totalAmount} mcg) and solution volume (${solutionVolume} ml) are correct.`;
        return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
      }
    }
  }

  if (concentration === null || isNaN(concentration) || concentration <= 0) {
    calculationError = 'Concentration is invalid or missing.';
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
    calculationError = 'Syringe details are missing.';
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
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Special case for mL as dose unit (direct volume administration)
  if (unit === 'mL') {
    calculatedVolume = doseValue;
  } else {
    // Standard dose calculations with unit conversions when needed
    let requiredVolume = doseValue / concentration;

    if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      requiredVolume = (doseValue / 1000) / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      requiredVolume = (doseValue * 1000) / concentration;
    }

    calculatedVolume = requiredVolume;
  }

  // Validate calculated volume against safe thresholds
  if (calculatedVolume < 0.005 || calculatedVolume > 2) {
    calculationError = "VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.";
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Check for insulin syringe practical limits before other capacity checks
  if (manualSyringe.type === 'Insulin' && calculatedVolume > 1) {
    // For insulin syringes, volumes > 1mL result in markings > 100 units, which is unrealistic
    calculationError = `Required volume (${calculatedVolume.toFixed(2)} ml) is too large for practical use with an insulin syringe. Consider using a standard syringe or checking your concentration calculation.`;
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate that the total amount is sufficient for the required dose
  if (totalAmount !== undefined && totalAmount !== null && unit !== 'mL') {
    calculationError = getMedicationAvailabilityError(doseValue, unit, concentrationUnit, totalAmount, calculatedVolume, concentration);
    if (calculationError) {
      return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
    }
  }

  const maxVolume = parseFloat(String(manualSyringe.volume).replace(/[^0-9.]/g, ''));
  if (calculatedVolume > maxVolume) {
    calculationError = `Required volume (${calculatedVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`;
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  const guidance = getMarkingGuidance(calculatedVolume, manualSyringe.type, markingsString);
  recommendedMarking = guidance.recommendedMarking;
  calculationError = guidance.precisionMessage;

  return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
}

/** Defensive volume check, separate from the earlier dose-amount check. */
export function getAvailableVolumeError(calculatedVolume: number, totalAmount: number, concentration: number): string | null {
  const maxPossibleVolume = totalAmount / concentration;
  if (calculatedVolume > maxPossibleVolume) {
    return `Required volume (${calculatedVolume.toFixed(2)} ml) exceeds what can be made from available medication (${maxPossibleVolume.toFixed(2)} ml).`;
  }
  return null;
}

function getMedicationAvailabilityError(
  doseValue: number,
  unit: CalculateDoseParams['unit'],
  concentrationUnit: CalculateDoseParams['concentrationUnit'],
  totalAmount: number,
  calculatedVolume: number,
  concentration: number,
): string | null {
  let doseInSameUnitAsTotal = doseValue;
  if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
    doseInSameUnitAsTotal = doseValue / 1000;
  } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
    doseInSameUnitAsTotal = doseValue * 1000;
  }
  if (doseInSameUnitAsTotal > totalAmount) {
    return `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${unit === 'mcg' && concentrationUnit === 'mg/ml' ? 'mg' : unit}).`;
  }
  return getAvailableVolumeError(calculatedVolume, totalAmount, concentration);
}
