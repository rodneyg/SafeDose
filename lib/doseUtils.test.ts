import { calculateDose, StandardSyringeVolume, InsulinSyringeVolume, SyringeVolume, ManualSyringe } from './doseUtils';
import { syringeOptions } from './utils'; // To verify mock volumes if needed

describe('calculateDose with volume thresholds', () => {
  // Valid syringe volumes based on syringeOptions
  const validStandardVolumeLarge: StandardSyringeVolume = '5 ml';
  const validStandardVolumeSmall: StandardSyringeVolume = '1 ml';

  const mockSyringeStandardLarge: ManualSyringe = { type: 'Standard', volume: validStandardVolumeLarge };
  const mockSyringeStandardSmall: ManualSyringe = { type: 'Standard', volume: validStandardVolumeSmall };

  // Basic valid inputs that can be overridden by tests
  const baseParams: Parameters<typeof calculateDose>[0] = {
    doseValue: 10,
    unit: 'mg',
    concentration: 10, // results in 1mL volume by default
    concentrationUnit: 'mg/ml',
    manualSyringe: mockSyringeStandardLarge,
    totalAmount: 100, // mg
    solutionVolume: '10', // ml
  };

  it('should return VOLUME_THRESHOLD_ERROR for volume < 0.005mL', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 0.1, // mg
      concentration: 100, // mg/ml
      // Calculated volume: 0.1 / 100 = 0.001 mL
    });
    expect(result.calculatedVolume).toBe(0.001);
    expect(result.calculationError).toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should return VOLUME_THRESHOLD_ERROR for volume > 2mL', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 30, // mg
      concentration: 10, // mg/ml
      // Calculated volume: 30 / 10 = 3 mL
    });
    expect(result.calculatedVolume).toBe(3);
    expect(result.calculationError).toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should NOT return VOLUME_THRESHOLD_ERROR for volume at lower bound (0.005mL)', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 0.5, // mg
      concentration: 100, // mg/ml
      // Calculated volume: 0.5 / 100 = 0.005 mL
    });
    expect(result.calculatedVolume).toBe(0.005);
    // Error might be null or related to markings, but not the threshold error
    expect(result.calculationError).not.toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should NOT return VOLUME_THRESHOLD_ERROR for volume at upper bound (2mL)', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 20, // mg
      concentration: 10, // mg/ml
      // Calculated volume: 20 / 10 = 2 mL
    });
    expect(result.calculatedVolume).toBe(2);
    expect(result.calculationError).not.toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should prioritize VOLUME_THRESHOLD_ERROR over syringe capacity error when volume > 2mL and exceeds syringe capacity', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 30, // mg
      concentration: 10, // mg/ml -> results in 3mL volume
      manualSyringe: mockSyringeStandardSmall, // Syringe capacity 1mL
    });
    // Calculated volume is 3mL, which is > 2mL (threshold) and > 1mL (syringe capacity)
    expect(result.calculatedVolume).toBe(3);
    expect(result.calculationError).toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should still show syringe capacity error if volume is within safe threshold but exceeds syringe capacity', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 1.5, // mg
      concentration: 1, // mg/ml -> results in 1.5mL volume (within 0.005-2mL safe threshold)
      manualSyringe: mockSyringeStandardSmall, // Syringe capacity 1mL
    });
    expect(result.calculatedVolume).toBe(1.5);
    expect(result.calculationError).toBe(`Required volume (1.50 ml) exceeds syringe capacity (1 ml).`);
  });

  // Test case for mL as dose unit, ensuring threshold check still applies
  it('should return VOLUME_THRESHOLD_ERROR for direct mL dose > 2mL', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 3, // Direct 3mL dose
      unit: 'mL' as 'mL',
      concentration: null, // Not used for mL dose
      concentrationUnit: 'mg/ml' as 'mg/ml', // Not strictly used but required by type
    });
    expect(result.calculatedVolume).toBe(3);
    expect(result.calculationError).toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  it('should NOT return VOLUME_THRESHOLD_ERROR for direct mL dose within safe range (e.g., 1mL)', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 1, // Direct 1mL dose
      unit: 'mL' as 'mL',
      concentration: null,
      concentrationUnit: 'mg/ml' as 'mg/ml',
    });
    expect(result.calculatedVolume).toBe(1);
    expect(result.calculationError).not.toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

  // Consider a case where totalAmount might be an issue, but volume threshold is hit first
   it('should prioritize VOLUME_THRESHOLD_ERROR over total amount insufficient error', () => {
    const result = calculateDose({
      ...baseParams,
      doseValue: 30, // mg (results in 3mL with concentration 10mg/mL)
      concentration: 10, // mg/ml
      totalAmount: 5, // Only 5mg available, so 0.5mL possible. Dose requires 30mg (3mL)
      manualSyringe: mockSyringeStandardLarge, // Large enough syringe
    });
    expect(result.calculatedVolume).toBe(3); // Volume is calculated first
    expect(result.calculationError).toBe("VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.");
  });

});
