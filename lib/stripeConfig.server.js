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

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Secret Key: ${stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 12) + '...' : 'NOT SET'}`);

// Validation warnings
if (!stripeConfig.secretKey) {
  console.warn(`Stripe secret key not set for ${effectiveMode} mode`);
}

module.exports = stripeConfig;