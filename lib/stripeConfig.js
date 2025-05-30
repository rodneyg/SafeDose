// Get environment variables from process.env consistently across all environments
// For Vercel web builds, environment variables are injected into process.env during build
const getEnvVar = (key, defaultValue = undefined) => {
  return process.env[key] || defaultValue;
};

const stripeMode = getEnvVar('STRIPE_MODE', 'test');

// Validate mode
if (stripeMode !== 'test' && stripeMode !== 'live') {
  console.error(`Invalid STRIPE_MODE: ${stripeMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
  // Fall back to test mode
}

const effectiveMode = (stripeMode === 'live') ? 'live' : 'test';

const stripeConfig = {
  publishableKey: effectiveMode === 'live'
    ? getEnvVar('STRIPE_LIVE_PUBLISHABLE_KEY')
    : getEnvVar('STRIPE_TEST_PUBLISHABLE_KEY'),
  secretKey: effectiveMode === 'live'
    ? getEnvVar('STRIPE_LIVE_SECRET_KEY')
    : getEnvVar('STRIPE_TEST_SECRET_KEY'),
  priceId: effectiveMode === 'live'
    ? getEnvVar('STRIPE_LIVE_PRICE_ID', 'price_1RUHgxAY2p4W374Yb5EWEtZ0') // Live price ID
    : getEnvVar('STRIPE_TEST_PRICE_ID', 'price_1REyzMPE5x6FmwJPyJVJIEXe'), // Existing test price ID
  mode: effectiveMode,
};

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Publishable Key: ${stripeConfig.publishableKey ? stripeConfig.publishableKey.substring(0, 12) + '...' : 'NOT SET'}`);

// Validation warnings
if (!stripeConfig.publishableKey) {
  console.warn(`Stripe publishable key not set for ${effectiveMode} mode`);
}

// Always provide CommonJS export for compatibility
module.exports = stripeConfig;