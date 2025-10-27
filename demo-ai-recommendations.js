#!/usr/bin/env node

/**
 * Demo script for AI-Driven Personalized Dosage Recommendation Engine
 * 
 * This script demonstrates the core functionality of the new recommendation system
 * including historical analysis, injection site rotation, and confidence scoring.
 */

console.log('🧠 SafeDose AI-Driven Personalized Dosage Recommendation Engine Demo');
console.log('====================================================================\n');

// Simulate historical dose data
const mockDoseHistory = [
  { doseValue: 10, timestamp: '2024-01-01', injectionSite: 'abdomen_L' },
  { doseValue: 12, timestamp: '2024-01-02', injectionSite: 'abdomen_R' },
  { doseValue: 11, timestamp: '2024-01-03', injectionSite: 'thigh_L' },
  { doseValue: 11.5, timestamp: '2024-01-04', injectionSite: 'thigh_R' },
  { doseValue: 10.5, timestamp: '2024-01-05', injectionSite: 'abdomen_L' },
];

console.log('📊 Historical Dose Analysis');
console.log('-----------------------------');

// Calculate average dose
const averageDose = mockDoseHistory.reduce((sum, log) => sum + log.doseValue, 0) / mockDoseHistory.length;
console.log(`Average Dose: ${averageDose.toFixed(2)} units`);

// Calculate dose variability (standard deviation)
const variance = mockDoseHistory.reduce((sum, log) => sum + Math.pow(log.doseValue - averageDose, 2), 0) / mockDoseHistory.length;
const doseVariability = Math.sqrt(variance);
console.log(`Dose Variability: ${doseVariability.toFixed(2)} units (std dev)`);

// Calculate adherence score (simulated)
const adherenceScore = 0.85; // 85% consistency in logging
console.log(`Adherence Score: ${(adherenceScore * 100).toFixed(0)}%`);

// Determine trend direction
const recentDoses = mockDoseHistory.slice(-3).map(log => log.doseValue);
const olderDoses = mockDoseHistory.slice(0, 2).map(log => log.doseValue);
const recentAvg = recentDoses.reduce((sum, dose) => sum + dose, 0) / recentDoses.length;
const olderAvg = olderDoses.reduce((sum, dose) => sum + dose, 0) / olderDoses.length;
const changePercent = (recentAvg - olderAvg) / olderAvg;

let trendDirection = 'stable';
if (changePercent > 0.1) trendDirection = 'increasing';
else if (changePercent < -0.1) trendDirection = 'decreasing';

console.log(`Dose Trend: ${trendDirection} (${(changePercent * 100).toFixed(1)}% change)\n`);

console.log('🎯 Injection Site Rotation Analysis');
console.log('------------------------------------');

// Analyze injection sites
const siteCounts = {};
const sitesUsed = [];
mockDoseHistory.forEach(log => {
  siteCounts[log.injectionSite] = (siteCounts[log.injectionSite] || 0) + 1;
  if (!sitesUsed.includes(log.injectionSite)) {
    sitesUsed.push(log.injectionSite);
  }
});

console.log('Site Usage:');
Object.entries(siteCounts).forEach(([site, count]) => {
  const percentage = ((count / mockDoseHistory.length) * 100).toFixed(0);
  console.log(`  ${site.replace('_', ' ').toUpperCase()}: ${count} times (${percentage}%)`);
});

// Calculate rotation score
const allSites = ['abdomen_L', 'abdomen_R', 'thigh_L', 'thigh_R', 'glute_L', 'glute_R', 'arm_L', 'arm_R'];
const rotationScore = Math.min(sitesUsed.length / 4, 1);
console.log(`Rotation Score: ${(rotationScore * 100).toFixed(0)}% (using ${sitesUsed.length}/8 available sites)`);

// Recommend next site
const unusedSites = allSites.filter(site => !sitesUsed.includes(site));
const recommendedSite = unusedSites.length > 0 ? unusedSites[0] : 
  allSites.find(site => (siteCounts[site] || 0) === Math.min(...Object.values(siteCounts)));
console.log(`Recommended Next Site: ${recommendedSite.replace('_', ' ').toUpperCase()}\n`);

console.log('🤖 AI Recommendation Generation');
console.log('---------------------------------');

// Generate personalized recommendation
let suggestedDose = averageDose;
let confidence = 0.5; // Start with medium confidence

// Adjust based on historical data quality
if (mockDoseHistory.length > 5) {
  confidence += 0.2;
  console.log('✓ Sufficient historical data (+20% confidence)');
}

// Adjust based on dose consistency
if (doseVariability < averageDose * 0.1) {
  confidence += 0.2;
  console.log('✓ Consistent dosing pattern (+20% confidence)');
} else if (doseVariability > averageDose * 0.3) {
  confidence -= 0.2;
  console.log('⚠ High dose variability (-20% confidence)');
}

// Adjust based on adherence
if (adherenceScore > 0.8) {
  confidence += 0.1;
  console.log('✓ Good adherence to logging (+10% confidence)');
}

// Apply trend adjustment
if (trendDirection === 'increasing' && doseVariability < averageDose * 0.1) {
  suggestedDose *= 1.05;
  console.log('📈 Slight upward adjustment for stable increasing trend');
} else if (trendDirection === 'decreasing' && doseVariability < averageDose * 0.1) {
  suggestedDose *= 0.95;
  console.log('📉 Slight downward adjustment for stable decreasing trend');
}

// Clamp confidence between 0.1 and 0.9
confidence = Math.max(0.1, Math.min(0.9, confidence));

console.log(`\n🎯 Final AI Recommendation`);
console.log('===========================');
console.log(`Suggested Dose: ${suggestedDose.toFixed(1)} units`);
console.log(`Confidence Level: ${(confidence * 100).toFixed(0)}% (${confidence >= 0.7 ? 'High' : confidence >= 0.4 ? 'Medium' : 'Low'})`);
console.log(`Reasoning: Based on ${mockDoseHistory.length} historical doses with ${trendDirection} trend`);

console.log(`\n⚕️ Safety Information`);
console.log('=====================');
console.log('• This is an AI-generated recommendation for demonstration purposes');
console.log('• Always verify calculations with a healthcare professional');
console.log('• Consider injection site rotation for optimal results');
console.log(`• Current rotation score: ${(rotationScore * 100).toFixed(0)}%`);

if (confidence < 0.5) {
  console.log('⚠️ LOW CONFIDENCE: Consult healthcare provider before use');
}

console.log('\n✨ Gamification Features');
console.log('========================');
console.log(`Current Streak: 5 days`);
console.log(`Total Points: 150`);
console.log(`Level: 2`);
console.log(`Next Badge: "7-Day Streak" (2 more days needed)`);

console.log('\n🔧 Technical Implementation Notes');
console.log('==================================');
console.log('• Uses rule-based fallback for initial implementation');
console.log('• TensorFlow.js integration planned for on-device ML');
console.log('• Privacy-first design with local data processing');
console.log('• HIPAA-compliant data handling and storage');
console.log('• Integration with existing SafeDose dose calculator');

console.log('\n✅ Demo completed successfully!');
console.log('The AI recommendation engine is ready for integration.');