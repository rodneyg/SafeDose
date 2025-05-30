import Constants from 'expo-constants';

const stripeMode = Constants.expoConfig?.extra?.STRIPE_MODE || 'test';

// Validate mode
if (stripeMode !== 'test' && stripeMode !== 'live') {
  console.error(`Invalid STRIPE_MODE: ${stripeMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
  // Fall back to test mode
}

const effectiveMode = (stripeMode === 'live') ? 'live' : 'test';

const stripeConfig = {
  publishableKey: effectiveMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_PUBLISHABLE_KEY
    : Constants.expoConfig?.extra?.STRIPE_TEST_PUBLISHABLE_KEY,
  secretKey: effectiveMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_SECRET_KEY
    : Constants.expoConfig?.extra?.STRIPE_TEST_SECRET_KEY,
  priceId: effectiveMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_PRICE_ID || 'price_live_...' // Replace with actual live price ID
    : Constants.expoConfig?.extra?.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe', // Existing test price ID
  mode: effectiveMode,
};

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Publishable Key: ${stripeConfig.publishableKey ? stripeConfig.publishableKey.substring(0, 12) + '...' : 'NOT SET'}`);

// Validation warnings
if (!stripeConfig.publishableKey) {
  console.warn(`Stripe publishable key not set for ${effectiveMode} mode`);
}

export default stripeConfig;