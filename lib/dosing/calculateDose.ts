import { Exact } from './exact';
import { AmountUnit, parseInputNumber } from './inputs';
import { getSyringeMarkings, SyringeSelection, syringeOptions } from './syringes';
import { getMarkingGuidance } from './markings';

export const MAX_INJECTION_VOLUME_ML = 2;

// Define specific volume types for better type safety
export type InsulinSyringeVolume = keyof typeof syringeOptions['Insulin'];
export type StandardSyringeVolume = keyof typeof syringeOptions['Standard'];
export type SyringeVolume = InsulinSyringeVolume | StandardSyringeVolume;

export interface ManualSyringe {
  type: 'Insulin' | 'Standard';
  needsConfirmation?: boolean;
  insulinScale?: string;
  needsScaleConfirmation?: boolean;
  volume: SyringeVolume; // Use the more specific type
}

export interface CalculateDoseParams {
  doseValue: number | null;
  concentrationExact?: string | null;
  concentration: number | null;
  unit: 'mg' | 'mcg' | 'units' | 'mL';
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmountUnit?: AmountUnit | null;
  totalAmount?: number | null;  // Total amount in vial
  manualSyringe: SyringeSelection | null;
  solutionVolume?: string | null;
}

export interface CalculateDoseResult {
  calculatedVolume: number | null;
  recommendedMarking: string | null;
  calculationError: string | null;
  guidance?: string | null;
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
  doseValue, concentration, concentrationExact, unit, concentrationUnit, totalAmount,
  totalAmountUnit, manualSyringe, solutionVolume,
}: CalculateDoseParams): CalculateDoseResult {
  let calculatedVolume: number | null = null;
  let calculatedConcentration: number | null = null;
  const fail = (calculationError: string): CalculateDoseResult => ({
    calculatedVolume, calculatedConcentration, recommendedMarking: null, calculationError,
  });
  if (doseValue === null || !Number.isFinite(doseValue) || doseValue <= 0) {
    return fail('Dose value is invalid or missing.');
  }
  const compatibility = validateUnitCompatibility(unit, concentrationUnit);
  if (!compatibility.isValid) return fail(compatibility.errorMessage);

  let exactTotal: Exact | null = null;
  if (totalAmount != null && unit !== 'mL') {
    if (!totalAmountUnit || !['mg', 'mcg', 'units'].includes(totalAmountUnit)) {
      return fail('Needs input: select the total amount unit.');
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return fail('Needs input: enter a valid total amount greater than zero.');
    const numerator = concentrationUnit.split('/')[0];
    if ((totalAmountUnit === 'units') !== (numerator === 'units')) {
      return fail('Needs input: vial and concentration units are incompatible.');
    }
    exactTotal = new Exact(totalAmount);
    if (totalAmountUnit === 'mcg' && numerator === 'mg') exactTotal = exactTotal.div(1000);
    if (totalAmountUnit === 'mg' && numerator === 'mcg') exactTotal = exactTotal.mul(1000);
  }

  let exactConcentration: Exact | null = null;
  if (unit !== 'mL') {
    if (concentrationExact) {
      try {
        exactConcentration = new Exact(concentrationExact);
      } catch {
        return fail('Needs input: invalid exact concentration.');
      }
      if (exactConcentration.compare(0) <= 0 || !Number.isFinite(exactConcentration.toNumber()) || exactConcentration.toNumber() === 0) {
        return fail('Needs input: invalid exact concentration.');
      }
    } else if (concentration !== null && Number.isFinite(concentration) && concentration > 0) {
      exactConcentration = new Exact(concentration);
    } else if (exactTotal && solutionVolume != null) {
      const volume = parseInputNumber(solutionVolume);
      if (volume > 0) {
        exactConcentration = exactTotal.div(volume);
        calculatedConcentration = exactConcentration.toNumber();
        if (!Number.isFinite(calculatedConcentration) || calculatedConcentration === 0) {
          calculatedConcentration = null;
          return fail('Needs input: concentration is outside the supported numeric range.');
        }
        if ((concentrationUnit === 'mg/ml' && exactConcentration.compare(0.01) < 0) ||
            (concentrationUnit === 'mcg/ml' && exactConcentration.compare(1) < 0)) {
          return fail(`Calculated concentration (${exactConcentration.fixed(4)} ${concentrationUnit}) is extremely low. Please verify the total amount (${exactTotal.toString()} ${concentrationUnit.split('/')[0]}) and solution volume (${solutionVolume} ml) are correct.`);
        }
      }
    }
    if (!exactConcentration) return fail('Concentration is invalid or missing.');
    if (concentrationExact) calculatedConcentration = exactConcentration.toNumber();
  }
  if (manualSyringe?.needsConfirmation) return fail('Needs input: confirm the syringe type and volume from its label.');
  if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) return fail('Syringe details are missing.');
  if (manualSyringe.needsScaleConfirmation) return fail('Needs input: confirm the insulin scale shown on the scanned syringe.');
  const scale = manualSyringe.insulinScale || 'U-100';
  if (manualSyringe.type === 'Insulin' && !['U-100', 'U-40'].includes(scale)) {
    return fail(`Unsupported insulin scale: ${scale}. Only U-100 and U-40 are supported.`);
  }
  const markingsString = getSyringeMarkings(manualSyringe);
  if (!markingsString) return fail(`Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`);

  let convertedDose = new Exact(doseValue);
  if (unit === 'mcg' && concentrationUnit === 'mg/ml') convertedDose = convertedDose.div(1000);
  else if (unit === 'mg' && concentrationUnit === 'mcg/ml') convertedDose = convertedDose.mul(1000);
  const volume = unit === 'mL' ? new Exact(doseValue) : convertedDose.div(exactConcentration!);
  calculatedVolume = volume.toNumber();
  if (volume.compare(MAX_INJECTION_VOLUME_ML) > 0) return fail(`VOLUME_THRESHOLD_ERROR:The ${MAX_INJECTION_VOLUME_ML} mL per-injection safety limit applies, including with 3 mL and 5 mL syringes. Please verify the concentration and protocol.`);
  if (volume.compare(0.005) < 0) return fail('VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.');
  if (manualSyringe.type === 'Insulin' && volume.compare(1) > 0) {
    return fail(`Required volume (${volume.fixed(2)} ml) is too large for practical use with an insulin syringe. Consider using a standard syringe or checking your concentration calculation.`);
  }
  if (exactTotal && convertedDose.compare(exactTotal) > 0) {
    return fail(`Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${totalAmountUnit}).`);
  }
  const capacity = Number(manualSyringe.volume.replace(/[^0-9.]/g, ''));
  if (volume.compare(capacity) > 0) return fail(`Required volume (${volume.fixed(2)} ml) exceeds syringe capacity (${capacity} ml).`);
  const guidance = getMarkingGuidance(volume, manualSyringe.type, markingsString, scale === 'U-40' ? 40 : 100);
  return { calculatedVolume, calculatedConcentration, recommendedMarking: guidance.recommendedMarking,
    calculationError: null, guidance: guidance.precisionMessage };
}

/** Defensive comparison for independently supplied volumes. */
export function getAvailableVolumeError(calculatedVolume: number, totalAmount: number, concentration: number): string | null {
  const maxPossibleVolume = new Exact(totalAmount).div(concentration);
  if (new Exact(calculatedVolume).compare(maxPossibleVolume) > 0) {
    return `Required volume (${new Exact(calculatedVolume).fixed(2)} ml) exceeds what can be made from available medication (${maxPossibleVolume.fixed(2)} ml).`;
  }
  return null;
}
