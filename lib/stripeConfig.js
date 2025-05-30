// Ensure environment variables are loaded for both client and server environments
require('dotenv').config();

// Determine if we're in a server-side environment (Node.js) or client-side environment (Expo)
const isServerEnvironment = typeof process !== 'undefined' && process.env && typeof window === 'undefined';

// Get environment variables from the appropriate source based on environment
const getEnvVar = (key, defaultValue = undefined) => {
  // For server-side (Vercel serverless functions), use process.env
  if (isServerEnvironment) {
    return process.env[key] || defaultValue;
  }
  // For client-side (Expo app), use expo-constants
  try {
    const Constants = require('expo-constants').default;
    return Constants.expoConfig?.extra?.[key] || defaultValue;
  } catch (error) {
    console.warn('expo-constants not available, falling back to default', key);
    return defaultValue;
  }
};

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
console.log(`Stripe Secret Key: ${stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 12) + '...' : 'NOT SET'}`);

// Validation warnings
if (!stripeConfig.publishableKey) {
  console.warn(`Stripe publishable key not set for ${effectiveMode} mode`);
}
if (!stripeConfig.secretKey) {
  console.warn(`Stripe secret key not set for ${effectiveMode} mode`);
}

// Always provide CommonJS export for compatibility
module.exports = stripeConfig;