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
  
  // Safety check for undefined or null values
  if (!doseUnit || !concentrationUnit) {
    console.error(`[validateUnitCompatibility] Invalid inputs: doseUnit=${doseUnit}, concentrationUnit=${concentrationUnit}`);
    return { 
      isCompatible: false, 
      message: `Invalid units provided: dose (${doseUnit || 'undefined'}) and concentration (${concentrationUnit || 'undefined'}).`
    };
  }
  
  // Normalize units to lowercase for consistent comparison
  const normalizedDoseUnit = doseUnit.toLowerCase();
  const normalizedConcentrationUnit = concentrationUnit.toLowerCase();
  
  // Volume-based doses (ml) are compatible with any concentration units
  if (normalizedDoseUnit === 'ml') {
    console.log('[validateUnitCompatibility] Volume-based dose is compatible with any concentration');
    return { isCompatible: true, message: null };
  }

  // Handle units directly (for clarity)
  if (normalizedDoseUnit === 'units' && normalizedConcentrationUnit === 'units/ml') {
    console.log('[validateUnitCompatibility] Units dose with units/ml concentration is compatible');
    return { isCompatible: true, message: null };
  }
  
  // Direct matches
  if (normalizedDoseUnit === 'mg' && normalizedConcentrationUnit === 'mg/ml') {
    console.log('[validateUnitCompatibility] mg dose with mg/ml concentration - direct match');
    return { isCompatible: true, message: null };
  }
  
  if (normalizedDoseUnit === 'mcg' && normalizedConcentrationUnit === 'mcg/ml') {
    console.log('[validateUnitCompatibility] mcg dose with mcg/ml concentration - direct match');
    return { isCompatible: true, message: null };
  }
  
  // Conversion matches (explicitly handled)
  if (normalizedDoseUnit === 'mg' && normalizedConcentrationUnit === 'mcg/ml') {
    console.log('[validateUnitCompatibility] mg dose with mcg/ml concentration - compatible with conversion');
    return { isCompatible: true, message: null };
  }
  
  if (normalizedDoseUnit === 'mcg' && normalizedConcentrationUnit === 'mg/ml') {
    console.log('[validateUnitCompatibility] mcg dose with mg/ml concentration - compatible with conversion');
    return { isCompatible: true, message: null };
  }

  console.log(`[validateUnitCompatibility] Units are not compatible: ${doseUnit} with ${concentrationUnit}`);
  return {
    isCompatible: false,
    message: `Unit mismatch between dose (${doseUnit}) and concentration (${concentrationUnit}). Please select compatible units.`
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
  try {
    console.log('[Calculate] Starting calculation with params:', { 
      doseValue, 
      concentration, 
      unit, 
      concentrationUnit, 
      totalAmount, 
      solutionVolume,
      manualSyringe: manualSyringe ? JSON.stringify(manualSyringe) : null
    });

    let calculatedVolume: number | null = null;
    let recommendedMarking: string | null = null;
    let calculationError: string | null = null;
    let calculatedConcentration: number | null = null;
    let calculatedMass: number | null = null;
    let precisionNote: string | null = null;

    // Validate the dose value
    if (doseValue === null || isNaN(doseValue) || doseValue <= 0) {
      calculationError = 'Dose value is invalid or missing.';
      console.log('[Calculate] Error: Invalid dose value');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }

    // Basic check for unit compatibility
    if (unit && concentrationUnit) {
      // Log the unit compatibility check for debugging
      console.log(`[Calculate] Checking compatibility between ${unit} dose and ${concentrationUnit} concentration`);
      const compatibility = validateUnitCompatibility(unit, concentrationUnit);
      console.log(`[Calculate] Unit compatibility result: ${JSON.stringify(compatibility)}`);
      
      if (!compatibility.isCompatible) {
        calculationError = compatibility.message;
        console.log(`[Calculate] Unit incompatibility detected: ${calculationError}`);
        return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
      }
    } else {
      calculationError = 'Missing dose unit or concentration unit.';
      console.log('[Calculate] Error: Missing units');
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
    
    // Check if concentration is valid after potential calculation
    if (concentration === null || isNaN(concentration) || concentration <= 0) {
      calculationError = 'Concentration is invalid or missing.';
      console.log('[Calculate] Error: Invalid concentration');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }

    // Validate syringe
    if (!manualSyringe || !manualSyringe.type || !manualSyringe.volume) {
      calculationError = 'Syringe details are missing.';
      console.log('[Calculate] Error: Missing syringe details');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }

    // Get syringe markings
    const markingsString = syringeOptions[manualSyringe.type][manualSyringe.volume];
    if (!markingsString) {
      calculationError = `Markings unavailable for ${manualSyringe.type} ${manualSyringe.volume} syringe.`;
      console.log('[Calculate] Error: Invalid syringe option');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }

    let requiredVolume: number;

    // Normalize units to lowercase for consistent comparison
    const normalizedUnit = unit.toLowerCase();
    const normalizedConcentrationUnit = concentrationUnit.toLowerCase();
    
    console.log(`[Calculate] Normalized units: ${normalizedUnit} dose with ${normalizedConcentrationUnit} concentration`);

    // Handle volume-based dose (ml) - calculate mass instead of volume
    if (normalizedUnit === 'ml') {
      console.log(`[Calculate] Handling ml-based dose: ${doseValue} ml`);
      
      calculatedMass = doseValue * concentration;
      console.log(`[Calculate] Calculated mass: ${calculatedMass} ${normalizedConcentrationUnit.split('/')[0]}`);
      
      // For ml dose, use the dose value directly as volume
      requiredVolume = doseValue;
    } 
    // Handle mg dose with mg/ml concentration
    else if (normalizedUnit === 'mg' && normalizedConcentrationUnit === 'mg/ml') {
      requiredVolume = doseValue / concentration;
      console.log(`[Calculate] mg dose with mg/ml concentration: ${requiredVolume} ml`);
    } 
    // Handle mcg dose with mcg/ml concentration
    else if (normalizedUnit === 'mcg' && normalizedConcentrationUnit === 'mcg/ml') {
      requiredVolume = doseValue / concentration;
      console.log(`[Calculate] mcg dose with mcg/ml concentration: ${requiredVolume} ml`);
    } 
    // Handle units dose with units/ml concentration
    else if (normalizedUnit === 'units' && normalizedConcentrationUnit === 'units/ml') {
      requiredVolume = doseValue / concentration;
      console.log(`[Calculate] units dose with units/ml concentration: ${requiredVolume} ml`);
    } 
    // Handle mcg dose with mg/ml concentration (convert mcg to mg)
    else if (normalizedUnit === 'mcg' && normalizedConcentrationUnit === 'mg/ml') {
      // Convert mcg to mg by dividing by 1000, then divide by concentration
      const doseInMg = doseValue / 1000;
      console.log(`[Calculate] Converting ${doseValue} mcg to ${doseInMg} mg for calculation`);
      requiredVolume = doseInMg / concentration;
      
      // Log the detailed calculation to help with debugging
      console.log(`[Calculate] mcg dose with mg/ml concentration: ${doseValue} mcg = ${doseInMg} mg, divided by ${concentration} mg/ml = ${requiredVolume} ml`);
      
      // Check if the volume is impractically small
      if (requiredVolume < 0.01) {
        console.log(`[Calculate] Warning: Calculated volume (${requiredVolume} ml) is extremely small`);
      }
    } 
    // Handle mg dose with mcg/ml concentration (convert mg to mcg)
    else if (normalizedUnit === 'mg' && normalizedConcentrationUnit === 'mcg/ml') {
      requiredVolume = (doseValue * 1000) / concentration;
      console.log(`[Calculate] mg dose with mcg/ml concentration (converted mg to mcg): ${requiredVolume} ml`);
    } 
    // Handle any other case (should not get here due to earlier validation)
    else {
      calculationError = `Unable to calculate dose for ${unit} with ${concentrationUnit}. Please select compatible units.`;
      console.log(`[Calculate] Error: Unsupported unit combination - normalized: ${normalizedUnit} with ${normalizedConcentrationUnit}`);
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }

    console.log(`[Calculate] Calculated required volume: ${requiredVolume} ml`);
    
    // Validate the required volume is positive and finite
    if (requiredVolume <= 0 || isNaN(requiredVolume) || !isFinite(requiredVolume)) {
      calculationError = `Invalid volume calculation: ${requiredVolume} ml. Please check your inputs.`;
      console.log('[Calculate] Error: Invalid volume calculation');
      return { calculatedVolume: null, recommendedMarking: null, calculationError, calculatedConcentration: null, calculatedMass: null };
    }
    
    // Add practical minimum volume check (0.01 ml is typically the smallest measurable amount on most syringes)
    if (requiredVolume < 0.01) {
      const doseUnitDisplay = unit.toLowerCase();
      const concUnitDisplay = concentrationUnit.toLowerCase();
      calculationError = `The calculated volume (${requiredVolume.toFixed(5)} ml) is too small to measure accurately. Consider using a lower concentration or higher dose.`;
      console.log(`[Calculate] Error: Volume too small to measure: ${requiredVolume} ml`);
      
      // Store the calculated values even though we're returning an error
      // This allows the UI to potentially display more information about the calculation
      return { calculatedVolume: requiredVolume, recommendedMarking: null, calculationError, calculatedConcentration, calculatedMass };
    }
    
    // Validate that the total amount is sufficient for the required dose
    if (totalAmount !== undefined && totalAmount !== null) {
      // Convert units if necessary to make a valid comparison
      let doseInSameUnitAsTotal = doseValue;
      
      if (normalizedUnit === 'mcg' && normalizedConcentrationUnit === 'mg/ml') {
        // If dose is in mcg but total is in mg, convert dose to mg for comparison
        doseInSameUnitAsTotal = doseValue / 1000;
        console.log(`[Calculate] Converting ${doseValue} mcg to ${doseInSameUnitAsTotal} mg for comparison with total amount`);
      } else if (normalizedUnit === 'mg' && normalizedConcentrationUnit === 'mcg/ml') {
        // If dose is in mg but total is in mcg, convert dose to mcg for comparison
        doseInSameUnitAsTotal = doseValue * 1000;
        console.log(`[Calculate] Converting ${doseValue} mg to ${doseInSameUnitAsTotal} mcg for comparison with total amount`);
      }
      
      // Now compare if the dose exceeds the total amount
      if (doseInSameUnitAsTotal > totalAmount) {
        calculationError = `Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${normalizedConcentrationUnit.split('/')[0]}).`;
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

    // Set calculated volume
    calculatedVolume = requiredVolume;

    // Validate against syringe capacity
    const maxVolume = parseFloat(manualSyringe.volume.replace(/[^0-9.]/g, ''));
    if (requiredVolume > maxVolume) {
      calculationError = `Required volume (${requiredVolume.toFixed(2)} ml) exceeds syringe capacity (${maxVolume} ml).`;
      console.log('[Calculate] Error: Volume exceeds capacity');
      return { calculatedVolume, recommendedMarking: null, calculationError, calculatedConcentration, calculatedMass };
    }

    try {
      // Find nearest marking on syringe (with added error handling)
      const markings = markingsString.split(',').map(m => {
        try {
          return parseFloat(m.trim());
        } catch (e) {
          console.log('[Calculate] Error parsing marking:', m);
          return 0;
        }
      }).filter(m => !isNaN(m) && isFinite(m));

      // Safety check - ensure we have valid markings
      if (markings.length === 0) {
        console.log('[Calculate] Warning: No valid markings found');
        precisionNote = "Could not determine precise syringe markings. Use calculated volume instead.";
        return { calculatedVolume, recommendedMarking: null, calculationError: null, calculatedConcentration, calculatedMass, precisionNote };
      }

      // For insulin syringes, we use units (×100), for standard syringes we use ml directly
      const markingScaleValue = manualSyringe.type === 'Insulin' ? requiredVolume * 100 : requiredVolume;
      console.log('[Calculate] Marking scale value:', markingScaleValue);

      if (isNaN(markingScaleValue) || !isFinite(markingScaleValue)) {
        console.log('[Calculate] Invalid marking scale value');
        return { calculatedVolume, recommendedMarking: null, calculationError: null, calculatedConcentration, calculatedMass, precisionNote: "Could not determine precise syringe markings." };
      }

      // Find the nearest marking
      const nearestMarking = markings.reduce((prev, curr) =>
        Math.abs(curr - markingScaleValue) < Math.abs(prev - markingScaleValue) ? curr : prev
      );
      console.log('[Calculate] Nearest marking:', nearestMarking);

      // Check for precision issues
      if (Math.abs(nearestMarking - markingScaleValue) > 0.01) {
        const unitLabel = manualSyringe.type === 'Insulin' ? 'units' : 'ml';
        precisionNote = `Calculated dose is ${markingScaleValue.toFixed(2)} ${unitLabel}. Nearest mark is ${nearestMarking} ${unitLabel}.`;
        console.log('[Calculate] Precision note:', precisionNote);
      }

      recommendedMarking = nearestMarking.toString();
      console.log('[Calculate] Set recommended marking:', recommendedMarking);
    } catch (error) {
      // If there's any error determining the marking, fall back to just volume
      console.log('[Calculate] Error finding nearest marking:', error);
      precisionNote = "Could not determine precise syringe markings. Use calculated volume instead.";
    }

    // Return successful calculation - note calculationError is null here
    return { calculatedVolume, recommendedMarking, calculationError: null, calculatedConcentration, calculatedMass, precisionNote };
  } catch (error) {
    // Catch any unexpected errors
    console.error('[Calculate] Unexpected error:', error);
    return { 
      calculatedVolume: null, 
      recommendedMarking: null, 
      calculationError: error instanceof Error ? error.message : 'An unexpected calculation error occurred.', 
      calculatedConcentration: null, 
      calculatedMass: null 
    };
  }
}