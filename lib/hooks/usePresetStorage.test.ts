import { DosePreset } from '../../types/preset';

// Simple test to verify preset types and functionality
describe('Preset Feature Integration', () => {
  test('preset type definitions are correct', () => {
    const samplePreset: DosePreset = {
      id: 'test-id',
      name: 'Test Preset',
      substanceName: 'Testosterone',
      doseValue: 100,
      unit: 'mg',
      concentrationValue: 250,
      concentrationUnit: 'mg/ml',
      timestamp: new Date().toISOString(),
    };

    expect(samplePreset.id).toBe('test-id');
    expect(samplePreset.name).toBe('Test Preset');
    expect(samplePreset.substanceName).toBe('Testosterone');
    expect(samplePreset.doseValue).toBe(100);
    expect(samplePreset.unit).toBe('mg');
    expect(samplePreset.concentrationValue).toBe(250);
    expect(samplePreset.concentrationUnit).toBe('mg/ml');
  });

  test('preset with total amount works correctly', () => {
    const presetWithTotal: DosePreset = {
      id: 'test-total',
      name: 'Total Amount Preset',
      substanceName: 'HCG',
      doseValue: 250,
      unit: 'units',
      totalAmount: 5000,
      totalAmountUnit: 'units',
      solutionVolume: 1,
      timestamp: new Date().toISOString(),
    };

    expect(presetWithTotal.totalAmount).toBe(5000);
    expect(presetWithTotal.totalAmountUnit).toBe('units');
    expect(presetWithTotal.solutionVolume).toBe(1);
  });

  test('optional preset fields work correctly', () => {
    const minimalPreset: DosePreset = {
      id: 'minimal',
      name: 'Minimal Preset',
      substanceName: 'Test',
      doseValue: 50,
      unit: 'mg',
      timestamp: new Date().toISOString(),
    };

    expect(minimalPreset.concentrationValue).toBeUndefined();
    expect(minimalPreset.notes).toBeUndefined();
    expect(minimalPreset.totalAmount).toBeUndefined();
  });
});