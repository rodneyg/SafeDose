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
    ? (process.env.STRIPE_LIVE_PRICE_ID || 'price_1RUHgxAY2p4W374Yb5EWEtZ0')
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

// Validation warnings
if (!stripeConfig.secretKey) {
  console.warn(`Stripe secret key not set for ${effectiveMode} mode`);
}

// Key type validation
if (stripeConfig.secretKey) {
  if (stripeConfig.secretKey.startsWith('pk_')) {
    console.error(`CRITICAL ERROR: Secret key appears to be a publishable key! This will cause API failures.`);
    stripeConfig.secretKey = null; // Reset to prevent usage
  } else if (!stripeConfig.secretKey.startsWith('sk_')) {
    console.error(`WARNING: Secret key does not start with 'sk_' - format may be incorrect.`);
    stripeConfig.secretKey = null; // Reset to prevent usage
  } else {
    console.log(`✓ Secret key format validation passed`);
  }
}

module.exports = stripeConfig;