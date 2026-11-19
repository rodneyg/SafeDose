#!/usr/bin/env node

/**
 * Simple validation script for SafeDose evaluation framework
 * This script validates that evaluation examples align with actual dose calculation behavior
 */

const { calculateDose } = require('../lib/doseUtils');
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating SafeDose Evaluation Framework Examples...\n');

// Helper function to create manual syringe object
function createSyringe(type, volume) {
  return { type, volume };
}

// Load and validate test sets
const testSetsDir = path.join(__dirname, '../evals/test-sets');
const testSets = fs.readdirSync(testSetsDir).filter(file => file.endsWith('.json'));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const testSetFile of testSets) {
  const testSetPath = path.join(testSetsDir, testSetFile);
  const testSet = JSON.parse(fs.readFileSync(testSetPath, 'utf8'));
  
  console.log(`📋 Testing: ${testSet.name}`);
  console.log(`   Description: ${testSet.description}\n`);
  
  for (const evaluation of testSet.evaluations) {
    totalTests++;
    console.log(`   🧪 ${evaluation.id}: ${evaluation.description}`);
    
    try {
      // Parse evaluation parameters from prompt
      // This is a simplified parser - a full implementation would be more robust
      let params = {};
      
      if (evaluation.id === 'basic-001') {
        // "Calculate dose: 2.5 mg Semaglutide, 10mg/ml concentration, using 1ml syringe"
        params = {
          doseValue: 2.5,
          unit: 'mg',
          concentration: 10,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '1 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'basic-002') {
        // "Calculate dose: 15 units insulin, 100 units/ml concentration, using insulin syringe"
        params = {
          doseValue: 15,
          unit: 'units',
          concentration: 100,
          concentrationUnit: 'units/ml',
          manualSyringe: createSyringe('Insulin', '100 units'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'basic-003') {
        // "Calculate dose: 500 mcg epinephrine, 1 mg/ml concentration"
        params = {
          doseValue: 500,
          unit: 'mcg',
          concentration: 1,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '1 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'basic-004') {
        // "Calculate dose: 2 mL saline flush, using 3ml syringe"
        params = {
          doseValue: 2,
          unit: 'mL',
          concentration: null,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '3 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'error-001') {
        // "Calculate dose: 0.01 mg medication, 100 mg/ml concentration"
        params = {
          doseValue: 0.01,
          unit: 'mg',
          concentration: 100,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '1 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'error-002') {
        // "Calculate dose: 50 mg medication, 10 mg/ml concentration"
        params = {
          doseValue: 50,
          unit: 'mg',
          concentration: 10,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '5 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else if (evaluation.id === 'error-003') {
        // "Calculate dose: 0 mg medication, 10 mg/ml concentration"
        params = {
          doseValue: 0,
          unit: 'mg',
          concentration: 10,
          concentrationUnit: 'mg/ml',
          manualSyringe: createSyringe('Standard', '1 ml'),
          totalAmount: null,
          solutionVolume: null
        };
      } else {
        console.log(`      ⚠️  Skipping ${evaluation.id} - no parser implementation yet`);
        continue;
      }
      
      // Run calculation
      const result = calculateDose(params);
      
      // Compare with expected output
      const expected = evaluation.expected_output;
      let matches = true;
      let differences = [];
      
      // Check calculated volume (allow small floating point differences)
      if (expected.calculatedVolume !== null && result.calculatedVolume !== null) {
        if (Math.abs(result.calculatedVolume - expected.calculatedVolume) > 0.001) {
          matches = false;
          differences.push(`calculatedVolume: expected ${expected.calculatedVolume}, got ${result.calculatedVolume}`);
        }
      } else if (expected.calculatedVolume !== result.calculatedVolume) {
        matches = false;
        differences.push(`calculatedVolume: expected ${expected.calculatedVolume}, got ${result.calculatedVolume}`);
      }
      
      // Check calculation error
      if (expected.calculationError !== result.calculationError) {
        matches = false;
        differences.push(`calculationError: expected "${expected.calculationError}", got "${result.calculationError}"`);
      }
      
      if (matches) {
        console.log(`      ✅ PASSED`);
        passedTests++;
      } else {
        console.log(`      ❌ FAILED`);
        differences.forEach(diff => console.log(`         - ${diff}`));
        failedTests++;
      }
      
    } catch (error) {
      console.log(`      ❌ ERROR: ${error.message}`);
      failedTests++;
    }
    
    console.log('');
  }
  
  console.log('');
}

// Summary
console.log('📊 Validation Summary:');
console.log(`   Total evaluations: ${totalTests}`);
console.log(`   Passed: ${passedTests}`);
console.log(`   Failed: ${failedTests}`);
console.log(`   Success rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

if (failedTests === 0) {
  console.log('\n🎉 All evaluation examples are valid and match SafeDose behavior!');
  console.log('\n📝 Next steps:');
  console.log('1. Add more evaluation test cases');
  console.log('2. Implement automated evaluation runner');
  console.log('3. Add image-based evaluations for AI scanning');
  process.exit(0);
} else {
  console.log('\n⚠️  Some evaluation examples need adjustment.');
  console.log('Please review the differences and update the expected outputs.');
  process.exit(1);
}