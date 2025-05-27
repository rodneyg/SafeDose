// Test for the specific scenario mentioned in the comment
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

describe('Bug fix test', () => {
  test('Correctly handles 500mcg dose with 15mg total amount and 5ml solution', () => {
    // Run the calculation with the specific scenario
    const result = calculateDose({
      doseValue: 500,
      unit: 'mcg',
      concentration: 3,  // 15mg/5ml = 3mg/ml
      concentrationUnit: 'mg/ml',
      totalAmount: 15,
      solutionVolume: '5',
      manualSyringe: { type: 'Standard', volume: '1 ml' },
    });
    
    console.log('Calculation result:', result);
    
    // Assert that we don't have an error
    expect(result.calculationError).toBeNull();
    
    // Check that we have a recommendedMarking
    expect(result.recommendedMarking).not.toBeNull();
    
    // Verify correct calculation: 500mcg = 0.5mg, 0.5mg / 3mg/ml = 0.167ml
    // The closest marking on a 1ml syringe would be 0.2ml
    expect(result.calculatedVolume).toBeCloseTo(0.167, 2);
    expect(result.recommendedMarking).toBe('0.2');
  });
});