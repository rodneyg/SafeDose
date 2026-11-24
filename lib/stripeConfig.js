const Constants = require('expo-constants').default;
const { resolveStripeMode } = require('./stripeMode');

// Expo loads the public checkout settings in app.config.js before bundling.
const getEnvVar = (key, defaultValue) => Constants.expoConfig?.extra?.[key] || defaultValue;

const effectiveMode = resolveStripeMode(getEnvVar('STRIPE_MODE'));

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
