#!/usr/bin/env node

/**
 * Demonstration script for exporting evaluation data captured from user interactions
 * This shows how to convert captured user data into training-ready format for model fine-tuning
 */

const fs = require('fs');
const path = require('path');

console.log('📊 SafeDose Evaluation Data Export Tool\n');

// Mock function to simulate the evaluation data capture export
// In a real app, this would come from the useEvaluationDataCapture hook
function mockExportEvaluationData(minQualityScore = 0.6) {
  // Simulate captured evaluation data from user interactions
  const mockCapturedData = [
    {
      id: 'eval_1640995200000_abc123',
      timestamp: 1640995200000,
      userIntent: 'manual_entry',
      prompt: 'Calculate dose: 2.5 mg Semaglutide, 10 mg/ml concentration, using standard 1 ml syringe',
      inputParameters: {
        doseValue: 2.5,
        unit: 'mg',
        substanceName: 'Semaglutide',
        concentration: 10,
        concentrationUnit: 'mg/ml',
        syringeType: 'Standard',
        syringeVolume: '1 ml'
      },
      result: {
        calculatedVolume: 0.25,
        recommendedMarking: '0.25 ml',
        calculationError: null,
        success: true
      },
      evaluationMetadata: {
        qualityScore: 0.9,
        verified: true,
        corrected: false
      }
    },
    {
      id: 'eval_1640995800000_def456',
      timestamp: 1640995800000,
      userIntent: 'scan',
      prompt: 'Analyze image for syringe and vial details. Identify syringe type, volume, markings and vial substance, concentration, total amount.',
      inputParameters: {
        scanMode: 'ai_vision'
      },
      result: {
        scanResult: {
          syringe: {
            type: 'Standard',
            volume: '3 ml',
            markings: '0.1,0.2,0.3,0.4,0.5,1.0,1.5,2.0,2.5,3.0'
          },
          vial: {
            substance: 'Insulin',
            totalAmount: '1000 units',
            concentration: '100 units/ml',
            expiration: '2025-12-31'
          }
        },
        success: true
      },
      evaluationMetadata: {
        qualityScore: 0.85,
        verified: false,
        corrected: false
      }
    },
    {
      id: 'eval_1640996400000_ghi789',
      timestamp: 1640996400000,
      userIntent: 'manual_entry',
      prompt: 'Calculate dose: 500 mcg epinephrine, 1 mg/ml concentration',
      inputParameters: {
        doseValue: 500,
        unit: 'mcg',
        substanceName: 'Epinephrine',
        concentration: 1,
        concentrationUnit: 'mg/ml',
        syringeType: 'Standard',
        syringeVolume: '1 ml'
      },
      result: {
        calculatedVolume: 0.5,
        recommendedMarking: '0.5 ml',
        calculationError: null,
        success: true
      },
      evaluationMetadata: {
        qualityScore: 0.8,
        verified: true,
        corrected: false
      }
    },
    {
      id: 'eval_1640997000000_jkl012',
      timestamp: 1640997000000,
      userIntent: 'manual_entry',
      prompt: 'Calculate dose: 0 mg medication, 10 mg/ml concentration',
      inputParameters: {
        doseValue: 0,
        unit: 'mg',
        substanceName: 'Test Medication',
        concentration: 10,
        concentrationUnit: 'mg/ml'
      },
      result: {
        calculatedVolume: null,
        recommendedMarking: null,
        calculationError: 'Dose value is invalid or missing.',
        success: false
      },
      evaluationMetadata: {
        qualityScore: 0.4, // Low quality due to invalid input
        verified: false,
        corrected: false
      }
    }
  ];

  // Filter by quality score
  return mockCapturedData.filter(item => item.evaluationMetadata.qualityScore >= minQualityScore);
}

function convertToEvaluationFormat(capturedData) {
  return capturedData.map(item => ({
    id: item.id,
    category: item.userIntent === 'scan' ? 'ai_scanning' : 'dose_calculation',
    description: `User interaction: ${item.prompt}`,
    image: item.image?.uri || null,
    prompt: item.prompt,
    expected_output: item.userIntent === 'scan' ? {
      scanResult: item.result.scanResult
    } : {
      calculatedVolume: item.result.calculatedVolume,
      recommendedMarking: item.result.recommendedMarking,
      calculationError: item.result.calculationError
    },
    metadata: {
      timestamp: item.timestamp,
      quality_score: item.evaluationMetadata.qualityScore,
      verified: item.evaluationMetadata.verified,
      corrected: item.evaluationMetadata.corrected,
      user_intent: item.userIntent
    }
  }));
}

function convertToTrainingFormat(evaluationData) {
  return evaluationData.map(item => ({
    messages: [
      {
        role: "user",
        content: item.prompt
      },
      {
        role: "assistant", 
        content: JSON.stringify(item.expected_output)
      }
    ],
    metadata: {
      id: item.id,
      category: item.category,
      quality_score: item.metadata.quality_score,
      timestamp: item.metadata.timestamp
    }
  }));
}

// Main export process
function main() {
  console.log('🔍 Fetching captured user interaction data...\n');

  // Export high-quality data (quality score >= 0.6)
  const capturedData = mockExportEvaluationData(0.6);
  console.log(`📊 Found ${capturedData.length} high-quality interactions\n`);

  // Convert to evaluation format
  const evaluationData = convertToEvaluationFormat(capturedData);
  console.log('📋 Sample evaluation format:');
  console.log(JSON.stringify(evaluationData[0], null, 2));
  console.log('\n');

  // Convert to training format for fine-tuning
  const trainingData = convertToTrainingFormat(evaluationData);
  console.log('🎯 Sample training format:');
  console.log(JSON.stringify(trainingData[0], null, 2));
  console.log('\n');

  // Create output directory
  const outputDir = path.join(__dirname, '..', 'evals', 'exported-data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save evaluation format
  const evalFile = path.join(outputDir, `evaluation-data-${Date.now()}.json`);
  fs.writeFileSync(evalFile, JSON.stringify({
    metadata: {
      export_timestamp: Date.now(),
      total_examples: evaluationData.length,
      min_quality_score: 0.6,
      categories: {
        dose_calculation: evaluationData.filter(d => d.category === 'dose_calculation').length,
        ai_scanning: evaluationData.filter(d => d.category === 'ai_scanning').length
      }
    },
    evaluations: evaluationData
  }, null, 2));

  // Save training format
  const trainingFile = path.join(outputDir, `training-data-${Date.now()}.jsonl`);
  const trainingLines = trainingData.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync(trainingFile, trainingLines);

  console.log('✅ Export complete!');
  console.log(`📄 Evaluation format: ${evalFile}`);
  console.log(`🎯 Training format: ${trainingFile}`);
  console.log(`\n📊 Export summary:`);
  console.log(`   Total examples: ${evaluationData.length}`);
  console.log(`   Dose calculations: ${evaluationData.filter(d => d.category === 'dose_calculation').length}`);
  console.log(`   AI scanning: ${evaluationData.filter(d => d.category === 'ai_scanning').length}`);
  console.log(`   Average quality score: ${(evaluationData.reduce((sum, d) => sum + d.metadata.quality_score, 0) / evaluationData.length).toFixed(2)}`);
  
  console.log('\n📝 Next steps for model fine-tuning:');
  console.log('1. Review exported data for quality and accuracy');
  console.log('2. Split data into training/validation sets');
  console.log('3. Use training data with your preferred ML framework');
  console.log('4. Evaluate improved model against evaluation test sets');
  console.log('5. Deploy improved model and continue data collection cycle');
}

if (require.main === module) {
  main();
}

module.exports = { 
  mockExportEvaluationData, 
  convertToEvaluationFormat, 
  convertToTrainingFormat 
};