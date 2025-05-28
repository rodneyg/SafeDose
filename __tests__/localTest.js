// Simple test script to check the calculation logic
const { calculateDose, validateUnitCompatibility } = require('../lib/doseUtils');

// Test the specific case mentioned in the issue comment
console.log('Testing mcg to mg/ml conversion:');
console.log('Validating compatibility:');
const compatibility = validateUnitCompatibility('mcg', 'mg/ml');
console.log('Compatibility result:', compatibility);

console.log('\nCalculating dose:');
const result = calculateDose({
  doseValue: 500, // 500 mcg
  concentration: 3000, // 3000 mg/ml (15,000 mg in 5 ml)
  unit: 'mcg',
  concentrationUnit: 'mg/ml',
  manualSyringe: { type: 'Standard', volume: '1 ml' },
});

console.log('Calculation result:', result);