import { calculateDose } from '../lib/doseUtils';

// Mock the syringeOptions import
jest.mock('../lib/utils', () => ({
  syringeOptions: {
    Standard: {
      '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
      '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
      '5 ml': '1,2,3,4,5',
      '10 ml': '1,2,3,4,5,6,7,8,9,10',
    },
    Insulin: {
      '0.3 ml (30 units)': '5,10,15,20,25,30',
      '0.5 ml (50 units)': '5,10,15,20,25,30,35,40,45,50',
      '1 ml (100 units)': '10,20,30,40,50,60,70,80,90,100',
    },
  },
}));

describe('calculateDose', () => {
  // Standard mock syringe used for all tests
  const mockSyringe = { type: 'Standard' as const, volume: '10 ml' };
  
  // Test case 1: Dose 50 mg, concentration 25 mg/mL -> expected volume 2.0 mL
  test('correctly calculates volume for 50 mg dose with 25 mg/mL concentration', () => {
    const result = calculateDose({
      doseValue: 50,
      concentration: 25,
      unit: 'mg',
      concentrationUnit: 'mg/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedVolume).toBeCloseTo(2.0, 1);
    expect(result.calculationError).toBeNull();
  });
  
  // Test case 2: Dose 12 IU, concentration 100 IU/mL -> expected volume 0.12 mL
  test('correctly calculates volume for 12 units dose with 100 units/mL concentration', () => {
    const result = calculateDose({
      doseValue: 12,
      concentration: 100,
      unit: 'units',
      concentrationUnit: 'units/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedVolume).toBeCloseTo(0.12, 2);
    expect(result.calculationError).toBeNull();
  });
  
  // Test case 3: Dose 1.5 mL, concentration 20 mg/mL -> expected mass 30 mg
  test('correctly calculates mass for 1.5 mL dose with 20 mg/mL concentration', () => {
    const result = calculateDose({
      doseValue: 1.5,
      concentration: 20,
      unit: 'ml',  // This will need to be added to the function
      concentrationUnit: 'mg/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedMass).toBeCloseTo(30, 1);
    expect(result.calculationError).toBeNull();
  });
  
  // Test case 4: Dose 0.25 mL, concentration 0.5 mg/mL -> expected mass 0.125 mg
  test('correctly calculates mass for 0.25 mL dose with 0.5 mg/mL concentration', () => {
    const result = calculateDose({
      doseValue: 0.25,
      concentration: 0.5,
      unit: 'ml',  // This will need to be added to the function
      concentrationUnit: 'mg/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedMass).toBeCloseTo(0.125, 3);
    expect(result.calculationError).toBeNull();
  });
  
  // Test case 5: Dose 3 mg, concentration 1 mg/mL -> expected volume 3 mL
  test('correctly calculates volume for 3 mg dose with 1 mg/mL concentration', () => {
    const result = calculateDose({
      doseValue: 3,
      concentration: 1,
      unit: 'mg',
      concentrationUnit: 'mg/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedVolume).toBeCloseTo(3.0, 1);
    expect(result.calculationError).toBeNull();
  });
  
  // Test unit mismatch error
  test('returns error for unit mismatch between dose and concentration', () => {
    const result = calculateDose({
      doseValue: 5,
      concentration: 10,
      unit: 'mg',
      concentrationUnit: 'units/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculationError).toContain('Unit mismatch');
  });
  
  // Test conversion between different units (mg and mcg)
  test('correctly handles conversion between mg and mcg', () => {
    const result = calculateDose({
      doseValue: 2000,
      concentration: 2,
      unit: 'mcg',
      concentrationUnit: 'mg/ml',
      manualSyringe: mockSyringe,
    });
    
    expect(result.calculatedVolume).toBeCloseTo(1.0, 1);
    expect(result.calculationError).toBeNull();
  });
});