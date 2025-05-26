import { syringeOptions } from '../lib/utils';

interface CalculateDoseParams {
  doseValue: number | null;
  concentration: number | null;
  unit: 'mg' | 'mcg' | 'units';
  concentrationUnit: 'mg/ml' | 'mcg/ml' | 'units/ml';
  totalAmount?: number | null;  // Total amount in vial
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string } | null;
}

interface CalculateDoseResult {
  calculatedVolume: number | null;
  recommendedMarking: string | null;
  calculationError: string | null;
}

export function calculateDose({
  doseValue,
  concentration,
  unit,
  concentrationUnit,
  totalAmount,
  manualSyringe,
}: CalculateDoseParams): CalculateDoseResult {
  console.log('[Calculate] Starting calculation');

  let calculatedVolume: number | null = null;
  let recommendedMarking: string | null = null;
  let calculationError: string | null = null;

  if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
    calculationError = 'Dose value is invalid or missing.';
    console.log('[Calculate] Error: Invalid dose value');
    return { calculatedVolume, recommendedMarking, calculationError };
  }

  if (concentration === null || isNaN(concentration) || concentration <= 0) {
    calculationError = 'Concentration is invalid or missing.';
    console.log('[Calculate] Error: Invalid concentration');
    return { calculatedVolume, recommendedMarking, calculationError };
  }

  if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
    calculationError = 'Syringe details are missing.';
    console.log('[Calculate] Error: Missing syringe details');
    return { calculatedVolume, recommendedMarking, calculationError };
  }

  const markingsString = syringeOptions[manualSyringe.type][manualSyringe.volume];
  if (!markingsString) {
    calculationError = `Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`;
    console.log('[Calculate] Error: Invalid syringe option');
    return { calculatedVolume, recommendedMarking, calculationError };
  }

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
  } else {
    calculationError = 'Unit mismatch between dose and concentration.';
    console.log('[Calculate] Error: Unit mismatch');
    return { calculatedVolume, recommendedMarking, calculationError };
  }

  console.log('[Calculate] Adjusted required volume (ml):', requiredVolume);
  
  // Validate that the total amount is sufficient for the required dose
  if (totalAmount !== undefined && totalAmount !== null) {
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
      calculationError = `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${unit === 'mcg' ? 'mg' : unit}).`;
      console.log('[Calculate] Error: Dose exceeds total available');
      return { calculatedVolume, recommendedMarking, calculationError };
    }
    
    // Check if the required volume exceeds what can be made from the total amount
    const maxPossibleVolume = totalAmount / concentration;
    if (requiredVolume > maxPossibleVolume) {
      calculationError = `Required volume (${requiredVolume.toFixed(2)} ml) exceeds what can be made from available medication (${maxPossibleVolume.toFixed(2)} ml).`;
      console.log('[Calculate] Error: Required volume exceeds possible volume from total');
      return { calculatedVolume, recommendedMarking, calculationError };
    }
  }

  calculatedVolume = requiredVolume;

  const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
  if (requiredVolume > maxVolume) {
    calculationError = `Required volume (${requiredVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`;
    console.log('[Calculate] Error: Volume exceeds capacity');
    return { calculatedVolume, recommendedMarking, calculationError };
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
  console.log('[Calculate] Set recommended marking:', nearestMarking);

  if (precisionMessage) {
    calculationError = precisionMessage;
    console.log('[Calculate] Precision message:', precisionMessage);
  }

  return { calculatedVolume, recommendedMarking, calculationError };
}