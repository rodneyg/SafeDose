const Constants = require('expo-constants').default;

// Expo loads the public checkout settings in app.config.js before bundling.
const getEnvVar = (key, defaultValue) => Constants.expoConfig?.extra?.[key] || defaultValue;

let stripeMode = getEnvVar('STRIPE_MODE', 'test');

// Validate mode
if (stripeMode !== 'test' && stripeMode !== 'live') {
  console.error(`Invalid STRIPE_MODE: ${stripeMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
  stripeMode = 'test';
}

const effectiveMode = stripeMode === 'live' ? 'live' : 'test';

const stripeConfig = {
  publishableKey: effectiveMode === 'live'
    ? getEnvVar('STRIPE_LIVE_PUBLISHABLE_KEY')
    : getEnvVar('STRIPE_TEST_PUBLISHABLE_KEY'),
  // Secret keys stay on the server (lib/stripeConfig.server.js / process.env). Never read them here.
  priceId: effectiveMode === 'live'
    ? getEnvVar('STRIPE_LIVE_PRICE_ID', 'price_1RUHgxAY2p4W374Yb5EWEtZ0') // Live price ID
    : getEnvVar('STRIPE_TEST_PRICE_ID', 'price_1REyzMPE5x6FmwJPyJVJIEXe'), // Existing test price ID
  mode: effectiveMode,
};

// Validation warnings
if (!stripeConfig.publishableKey) {
  console.warn(`Stripe publishable key not set for ${effectiveMode} mode`);
}
// Always provide CommonJS export for compatibility
module.exports = stripeConfig;
