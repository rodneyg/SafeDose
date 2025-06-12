import { syringeOptions } from '../lib/utils';

/**
 * @file doseUtils.ts
 * @description This file contains utility functions for calculating medication doses,
 * validating unit compatibility, and determining appropriate syringe markings.
 * It handles various units of measurement (mg, mcg, units, mL) and concentrations (mg/ml, mcg/ml, units/ml),
 * considering different syringe types (Insulin, Standard) and their specific volumes and markings.
 * The primary function, `calculateDose`, takes dose parameters and returns the calculated volume,
 * recommended syringe marking, and any potential errors or warnings.
 */

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
 * Validates if the dose unit and concentration unit are compatible for calculation.
 * For instance, a dose in 'mg' can be calculated with a concentration in 'mg/ml' or 'mcg/ml' (requiring conversion),
 * but not with 'units/ml'. A dose in 'mL' is compatible with any concentration unit as it's a direct volume.
 *
 * @param doseUnit - The unit of the dose ('mg', 'mcg', 'units', 'mL').
 * @param concentrationUnit - The unit of the concentration ('mg/ml', 'mcg/ml', 'units/ml').
 * @returns An object containing:
 *    - `isValid` (boolean): True if units are compatible, false otherwise.
 *    - `errorMessage` (string | undefined): An error message if units are not compatible.
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
 * Retrieves a list of concentration units that are compatible with a given dose unit.
 * This helps in guiding users to select appropriate concentration units based on their dose unit.
 * For example, if the dose is in 'mg', compatible concentration units are 'mg/ml' and 'mcg/ml'.
 * If the dose is in 'mL', any concentration unit is considered compatible.
 *
 * @param doseUnit - The unit of the dose ('mg', 'mcg', 'units', 'mL').
 * @returns An array of compatible concentration unit strings.
 */
export function getCompatibleConcentrationUnits(
  doseUnit: 'mg' | 'mcg' | 'units' | 'mL'
): ('mg/ml' | 'mcg/ml' | 'units/ml')[] {
  switch (doseUnit) {
    case 'mg':
      return ['mg/ml', 'mcg/ml']; // mg can be paired with mg/ml or mcg/ml (conversion needed)
    case 'mcg':
      return ['mcg/ml', 'mg/ml']; // mcg can be paired with mcg/ml or mg/ml (conversion needed)
    case 'units':
      return ['units/ml']; // units are typically paired only with units/ml
    case 'mL':
      return ['mg/ml', 'mcg/ml', 'units/ml']; // A dose in mL is a direct volume, compatible with any concentration
    default:
      // Default case, should ideally not be reached if doseUnit is strictly typed
      return ['mg/ml', 'mcg/ml', 'units/ml'];
  }
}

/**
 * Calculates the required volume for a given medication dose based on its concentration.
 * It also determines the recommended syringe marking and identifies potential calculation errors.
 *
 * @param params - An object containing dose calculation parameters:
 *   @param doseValue - The numerical value of the dose.
 *   @param concentration - The numerical value of the medication concentration.
 *                         Can be null if `totalAmount` and `solutionVolume` are provided for on-the-fly calculation.
 *   @param unit - The unit of the dose ('mg', 'mcg', 'units', 'mL').
 *   @param concentrationUnit - The unit of the concentration ('mg/ml', 'mcg/ml', 'units/ml').
 *   @param totalAmount - (Optional) The total amount of medication in the vial (e.g., powder in mg or mcg).
 *                        Used with `solutionVolume` to calculate concentration if not directly provided.
 *   @param manualSyringe - An object detailing the selected syringe:
 *     @param type - The type of syringe ('Insulin' or 'Standard').
 *     @param volume - The volume capacity of the syringe (e.g., '1ml', '100units').
 *   @param solutionVolume - (Optional) The volume of diluent/solution to be added to `totalAmount` to achieve the desired concentration.
 *                          Used with `totalAmount` to calculate concentration.
 * @returns An object containing:
 *   @property calculatedVolume - The calculated volume in mL. Null if an error occurs.
 *   @property recommendedMarking - The recommended marking on the syringe (can be a precise value). Null if an error occurs.
 *                                  For insulin syringes, this is in units; for standard syringes, in mL.
 *   @property calculationError - A string describing any error or warning encountered during calculation. Null if no error.
 *                                This can include unit mismatches, invalid inputs, volume exceeding syringe capacity,
 *                                dose exceeding total available medication, or precision guidance.
 *   @property calculatedConcentration - (Optional) The concentration calculated from `totalAmount` and `solutionVolume`, if applicable.
 *
 * @remarks
 * Edge Cases and Complex Logic:
 * - Unit Compatibility: Validates if `unit` and `concentrationUnit` are compatible using `validateUnitCompatibility`.
 * - On-the-fly Concentration Calculation: If `concentration` is not provided but `totalAmount` and `solutionVolume` are,
 *   it calculates the concentration. It includes checks for unreasonably low calculated concentrations.
 * - Unit Conversions: Handles conversions between 'mg' and 'mcg' when dose and concentration units differ (e.g., dose in 'mg', concentration in 'mcg/ml').
 * - mL Dose: If `unit` is 'mL', `doseValue` is treated as a direct volume, and concentration is used primarily for validation against `totalAmount`.
 * - Syringe Markings: Determines the nearest or exact marking based on `manualSyringe` details and `syringeOptions`.
 * - Safety Thresholds: Checks if `calculatedVolume` is within safe minimum (0.005 mL) and maximum (2 mL) practical limits.
 * - Insulin Syringe Limits: Special check for insulin syringes where volume > 1mL (100 units) is generally impractical.
 * - Total Amount Validation: Ensures the required dose does not exceed the `totalAmount` available in the vial, considering unit conversions.
 * - Syringe Capacity: Ensures `calculatedVolume` does not exceed the selected `manualSyringe` capacity.
 * - Precision Guidance: If the exact calculated dose falls between standard syringe markings, provides a message guiding the user.
 */
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
  let calculatedConcentration: number | null = null; // Store concentration if calculated on-the-fly

  // Validate essential inputs: doseValue must be a positive number.
  if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
    calculationError = 'Dose value is invalid or missing.';
    console.log('[Calculate] Error: Invalid dose value');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate unit compatibility before proceeding with calculations.
  const unitCompatibility = validateUnitCompatibility(unit, concentrationUnit);
  if (!unitCompatibility.isValid) {
    calculationError = unitCompatibility.errorMessage || 'Unit mismatch between dose and concentration.';
    console.log(`[Calculate] Error: ${calculationError}`);
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Attempt to calculate concentration if not provided but totalAmount and solutionVolume are.
  // This is for scenarios like reconstituting a powder.
  if ((concentration === null || isNaN(concentration) || concentration <= 0) && 
      totalAmount !== null && totalAmount !== undefined && totalAmount > 0 && 
      solutionVolume !== null && solutionVolume !== undefined && solutionVolume !== '') {
    
    const solVolume = parseFloat(solutionVolume); // Convert solution volume string to number
    if (!isNaN(solVolume) && solVolume > 0) {
      // Calculate the concentration: amount of drug / volume of solution
      calculatedConcentration = totalAmount / solVolume;
      concentration = calculatedConcentration; // Use this calculated concentration for subsequent steps
      console.log(`[Calculate] Calculated concentration from totalAmount ${totalAmount} and solutionVolume ${solVolume}: ${concentration}`);
      
      // Sanity check for the calculated concentration to prevent extremely dilute solutions.
      // These thresholds are somewhat arbitrary and might need adjustment based on common clinical scenarios.
      if (concentrationUnit === 'mg/ml' && concentration < 0.01) { // e.g. less than 0.01 mg/ml
        calculationError = `Calculated concentration (${concentration.toFixed(4)} mg/ml) is extremely low. Please verify the total amount (${totalAmount} mg) and solution volume (${solutionVolume} ml) are correct.`;
        console.log('[Calculate] Error: Calculated concentration is unreasonably low');
        return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
      } else if (concentrationUnit === 'mcg/ml' && concentration < 1) { // e.g. less than 1 mcg/ml
        calculationError = `Calculated concentration (${concentration.toFixed(4)} mcg/ml) is extremely low. Please verify the total amount (${totalAmount} mcg) and solution volume (${solutionVolume} ml) are correct.`;
        console.log('[Calculate] Error: Calculated concentration is unreasonably low');
        return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
      }
    }
  }
  
  // After potential calculation, if concentration is still invalid, return an error.
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

  // If the dose unit is 'mL', the doseValue is the direct volume to be administered.
  // No complex calculation is needed, but concentration is still relevant for other checks (e.g., total amount).
  if (unit === 'mL') {
    calculatedVolume = doseValue;
    console.log('[Calculate] Direct volume dose (mL):', calculatedVolume);
  } else {
    // Standard dose calculation: Volume = Dose / Concentration
    // This section handles necessary unit conversions between dose and concentration.
    let requiredVolume = doseValue / concentration; // Initial calculation, assumes units are directly compatible
    console.log('[Calculate] Initial required volume (ml):', requiredVolume);

    // Adjust volume based on unit discrepancies (e.g., dose in mcg, concentration in mg/ml)
    if (unit === 'mcg' && concentrationUnit === 'mcg/ml') {
      // No conversion needed
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mg/ml') {
      // No conversion needed
      requiredVolume = doseValue / concentration;
    } else if (unit === 'units' && concentrationUnit === 'units/ml') {
      // No conversion needed
      requiredVolume = doseValue / concentration;
    } else if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      // Convert dose from mcg to mg (doseValue / 1000) then divide by concentration (mg/ml)
      requiredVolume = (doseValue / 1000) / concentration;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      // Convert dose from mg to mcg (doseValue * 1000) then divide by concentration (mcg/ml)
      requiredVolume = (doseValue * 1000) / concentration;
    }

    calculatedVolume = requiredVolume;
    console.log('[Calculate] Adjusted required volume (ml):', requiredVolume);
  }

  // Validate calculated volume against practical minimum and maximum thresholds.
  // These thresholds prevent extremely small (hard to measure) or large (potentially unsafe/unrealistic) volumes.
  if (calculatedVolume !== null && (calculatedVolume < 0.005 || calculatedVolume > 2)) {
    calculationError = "VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.";
    console.log('[Calculate] Error: Calculated volume is outside safe thresholds');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Specific check for insulin syringes: volumes greater than 1mL (100 units) are typically impractical.
  if (manualSyringe.type === 'Insulin' && calculatedVolume > 1) {
    calculationError = `Required volume (${calculatedVolume.toFixed(2)} ml) is too large for practical use with an insulin syringe. Consider using a standard syringe or checking your concentration calculation.`;
    console.log('[Calculate] Error: Volume too large for insulin syringe practical use');
    return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
  }

  // Validate that the total amount is sufficient for the required dose
  if (totalAmount !== undefined && totalAmount !== null && unit !== 'mL') {
    // Convert dose to the same unit as totalAmount for a valid comparison.
    // This is important if, for example, dose is in 'mcg' and totalAmount is in 'mg'.
    let doseInSameUnitAsTotal = doseValue;
    
    if (unit === 'mcg' && concentrationUnit === 'mg/ml') {
      // If dose is in mcg and concentration implies totalAmount is in mg, convert dose to mg for comparison.
      doseInSameUnitAsTotal = doseValue / 1000;
    } else if (unit === 'mg' && concentrationUnit === 'mcg/ml') {
      // If dose is in mg and concentration implies totalAmount is in mcg, convert dose to mcg for comparison.
      doseInSameUnitAsTotal = doseValue * 1000;
    }
    
    // Check if the required dose (in compatible units) exceeds the total amount available.
    if (doseInSameUnitAsTotal > totalAmount) {
      // Determine the unit of totalAmount based on concentrationUnit for the error message
      const totalAmountUnit = concentrationUnit.startsWith('mg/') ? 'mg' : concentrationUnit.startsWith('mcg/') ? 'mcg' : 'units';
      calculationError = `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${totalAmountUnit}).`;
      console.log('[Calculate] Error: Dose exceeds total available');
      return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
    }
    
    // Also, check if the calculated volume to administer would require more drug than is available,
    // based on the concentration. This is another way to view the same constraint.
    const maxPossibleVolume = totalAmount / concentration; // Max volume that can be prepared from totalAmount
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

  const markings = markingsString.split(',').map((m: string) => parseFloat(m)); // Convert comma-separated marking strings to numbers
  // For insulin syringes, markings are in units (volume * 100 for U-100 insulin).
  // For standard syringes, markings are in mL (same as calculatedVolume).
  const markingScaleValue = manualSyringe.type === 'Insulin' ? calculatedVolume * 100 : calculatedVolume;
  console.log('[Calculate] Marking scale value:', markingScaleValue);

  // Find the closest standard marking on the syringe to the calculated value.
  // This can be used for guidance if exact measurement is difficult.
  const nearestMarking = markings.reduce((prev: number, curr: number) =>
    Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
  );
  console.log('[Calculate] Nearest marking:', nearestMarking);

  // The recommended marking is the exact calculated value for precision.
  // Users will be guided if this value falls between actual syringe gradations.
  recommendedMarking = markingScaleValue.toString();
  console.log('[Calculate] Set recommended marking to exact value:', markingScaleValue);

  // Provide a precision message if the exact value isn't a standard marking.
  // This helps the user understand how to draw the dose accurately.
  let precisionMessage = null;
  // Check if the difference between the exact value and the nearest standard marking is significant (e.g., > 0.01 units/mL).
  if (Math.abs(nearestMarking - markingScaleValue) > 0.01) { // Using a small threshold to avoid messages for tiny differences
    const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
    const exactValue = markingScaleValue.toFixed(2); // Format to 2 decimal places for clarity
    
    // Find the two standard markings that the exact value falls between.
    const sortedMarkings = [...markings].sort((a, b) => a - b); // Sort markings to find lower and upper bounds
    const lowerMark = sortedMarkings.filter(m => m <= markingScaleValue).pop(); // Largest marking less than or equal to exact value
    const upperMark = sortedMarkings.find(m => m > markingScaleValue);    // Smallest marking greater than exact value
    
    if (lowerMark !== undefined && upperMark !== undefined) {
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is between the ${lowerMark} ${unitLabel} and ${upperMark} ${unitLabel} marks.`;
    } else if (markingScaleValue < sortedMarkings[0]) {
      // If the value is below the smallest marking
      precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is below the first marking at ${sortedMarkings[0]} ${unitLabel}.`;
    } else if (lowerMark !== undefined && upperMark === undefined && markingScaleValue > lowerMark) {
      // If the value is above the largest marking
       precisionMessage = `Draw to ${exactValue} ${unitLabel}, which is above the ${lowerMark} ${unitLabel} mark.`;
    } else {
      // Fallback, though less likely with sorted markings
      precisionMessage = `Draw to ${exactValue} ${unitLabel}. The nearest standard mark is ${nearestMarking} ${unitLabel}.`;
    }
  }

  // If a precision message was generated, it's appended or set as the calculationError.
  // This ensures the user is aware of how to accurately measure the dose.
  if (precisionMessage) {
    calculationError = calculationError ? `${calculationError} ${precisionMessage}` : precisionMessage; // Append if other errors exist
    console.log('[Calculate] Precision guidance:', precisionMessage);
  }

  return { calculatedVolume, recommendedMarking, calculationError, calculatedConcentration };
}