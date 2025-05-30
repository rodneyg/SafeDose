require('dotenv').config();

const stripeMode = process.env.STRIPE_MODE || 'test';

const stripeConfig = {
  publishableKey: stripeMode === 'live'
    ? process.env.STRIPE_LIVE_PUBLISHABLE_KEY
    : (process.env.STRIPE_TEST_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY),
  secretKey: stripeMode === 'live'
    ? process.env.STRIPE_LIVE_SECRET_KEY
    : (process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
  priceId: stripeMode === 'live'
    ? (process.env.STRIPE_LIVE_PRICE_ID || 'price_live_...')
    : (process.env.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe'),
  mode: stripeMode,
};

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Secret Key: ${stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 12) + '...' : 'NOT SET'}`);

module.exports = stripeConfig;