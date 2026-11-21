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

if (stripeConfig.publishableKey && !stripeConfig.publishableKey.startsWith('pk_')) {
  console.error('Stripe publishable key is invalid.');
  stripeConfig.publishableKey = null;
}

if (stripeConfig.secretKey && !/^(sk|rk)_/.test(stripeConfig.secretKey)) {
  console.error('Stripe server key is invalid.');
  stripeConfig.secretKey = null;
}

module.exports = stripeConfig;
