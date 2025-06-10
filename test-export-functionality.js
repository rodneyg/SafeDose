// Simple test script to validate the group analyzer export functionality
const {
  logAnalyticsEventWithStorage,
  exportGroupedAnalytics,
  exportAnalyticsAsCSV,
  exportAnalyticsSummary,
  clearAnalyticsStore,
  USER_SEGMENTS,
  ANALYTICS_EVENTS
} = require('./lib/analytics.ts');

console.log('Testing Group Analyzer Export Functionality...\n');

// Clear any existing data
clearAnalyticsStore();

// Simulate some analytics events
console.log('1. Adding test analytics events...');
logAnalyticsEventWithStorage(
  'scan_attempt',
  { method: 'camera' },
  USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
  'user_1'
);

logAnalyticsEventWithStorage(
  'scan_success',
  { method: 'camera' },
  USER_SEGMENTS.HEALTHCARE_PROFESSIONAL,
  'user_1'
);

logAnalyticsEventWithStorage(
  'scan_attempt',
  { method: 'manual' },
  USER_SEGMENTS.COSMETIC_USER,
  'user_2'
);

logAnalyticsEventWithStorage(
  'upgrade_success',
  { plan: 'plus' },
  USER_SEGMENTS.PERSONAL_MEDICAL_USER,
  'user_3'
);

logAnalyticsEventWithStorage(
  'sign_in_success',
  { method: 'email' },
  USER_SEGMENTS.GENERAL_USER,
  'user_4'
);

console.log('Events added successfully.\n');

// Test export functionality
console.log('2. Testing grouped analytics export...');
const groupedData = exportGroupedAnalytics();
console.log('Grouped Data:', JSON.stringify(groupedData, null, 2));
console.log('\n');

console.log('3. Testing CSV export...');
const csvData = exportAnalyticsAsCSV();
console.log('CSV Export:\n', csvData);
console.log('\n');

console.log('4. Testing analytics summary...');
const summary = exportAnalyticsSummary();
console.log('Summary:', JSON.stringify(summary, null, 2));
console.log('\n');

console.log('✅ Group analyzer export functionality test completed successfully!');