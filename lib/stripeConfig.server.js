require('dotenv').config();

const stripeMode = process.env.STRIPE_MODE || 'test';

// Validate mode
if (stripeMode !== 'test' && stripeMode !== 'live') {
  console.error(`Invalid STRIPE_MODE: ${stripeMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
  // Fall back to test mode
}

const effectiveMode = (stripeMode === 'live') ? 'live' : 'test';

const stripeConfig = {
  publishableKey: effectiveMode === 'live'
    ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY
    : (process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY),
  secretKey: effectiveMode === 'live'
    ? process.env.STRIPE_LIVE_SECRET_KEY
    : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
  priceId: effectiveMode === 'live'
    ? (process.env.STRIPE_LIVE_PRICE_ID || 'price_live_...')
    : (process.env.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe'),
  mode: effectiveMode,
};

// Validate that keys are not swapped
if (stripeConfig.publishableKey && !stripeConfig.publishableKey.startsWith('pk_')) {
  console.error(`CRITICAL ERROR: Publishable key has invalid format. Expected 'pk_*', got: ${stripeConfig.publishableKey.substring(0, 7)}...`);
  stripeConfig.publishableKey = null; // Reset to prevent usage
}

if (stripeConfig.secretKey && stripeConfig.publishableKey && stripeConfig.secretKey === stripeConfig.publishableKey) {
  console.error(`CRITICAL ERROR: Secret key and publishable key are the same! This indicates a configuration error.`);
  stripeConfig.secretKey = null; // Reset to prevent usage
}

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Secret Key: ${stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 12) + '...' : 'NOT SET'}`);

// Additional debug logging for environment variables
console.log(`Environment check - STRIPE_MODE: ${process.env.STRIPE_MODE}`);
console.log(`Environment check - effectiveMode: ${effectiveMode}`);
if (effectiveMode === 'live') {
  console.log(`Live mode - STRIPE_LIVE_SECRET_KEY: ${process.env.STRIPE_LIVE_SECRET_KEY ? process.env.STRIPE_LIVE_SECRET_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
  console.log(`Live mode - STRIPE_LIVE_PUBLISHABLE_KEY: ${process.env.STRIPE_LIVE_PUBLISHABLE_KEY ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
} else {
  console.log(`Test mode - STRIPE_TEST_SECRET_KEY: ${process.env.STRIPE_TEST_SECRET_KEY ? process.env.STRIPE_TEST_SECRET_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
  console.log(`Test mode - STRIPE_SECRET_KEY (fallback): ${process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
  console.log(`Test mode - STRIPE_TEST_PUBLISHABLE_KEY: ${process.env.STRIPE_TEST_PUBLISHABLE_KEY ? process.env.STRIPE_TEST_PUBLISHABLE_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
  console.log(`Test mode - STRIPE_PUBLISHABLE_KEY (fallback): ${process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY.substring(0, 12) + '...' : 'NOT SET'}`);
}

// Validation warnings
if (!stripeConfig.secretKey) {
  console.warn(`Stripe secret key not set for ${effectiveMode} mode`);
}

// Key type validation
if (stripeConfig.secretKey) {
  if (stripeConfig.secretKey.startsWith('pk_')) {
    console.error(`CRITICAL ERROR: Secret key appears to be a publishable key! This will cause API failures.`);
    console.error(`Secret key value: ${stripeConfig.secretKey.substring(0, 12)}...`);
  } else if (!stripeConfig.secretKey.startsWith('sk_')) {
    console.error(`WARNING: Secret key does not start with 'sk_' - format may be incorrect.`);
    console.error(`Secret key value: ${stripeConfig.secretKey.substring(0, 12)}...`);
  } else {
    console.log(`✓ Secret key format validation passed`);
  }
}

module.exports = stripeConfig;