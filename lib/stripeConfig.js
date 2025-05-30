import Constants from 'expo-constants';

const stripeMode = Constants.expoConfig?.extra?.STRIPE_MODE || 'test';

const stripeConfig = {
  publishableKey: stripeMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_PUBLISHABLE_KEY
    : Constants.expoConfig?.extra?.STRIPE_TEST_PUBLISHABLE_KEY,
  secretKey: stripeMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_SECRET_KEY
    : Constants.expoConfig?.extra?.STRIPE_TEST_SECRET_KEY,
  priceId: stripeMode === 'live'
    ? Constants.expoConfig?.extra?.STRIPE_LIVE_PRICE_ID || 'price_live_...' // Replace with actual live price ID
    : Constants.expoConfig?.extra?.STRIPE_TEST_PRICE_ID || 'price_1REyzMPE5x6FmwJPyJVJIEXe', // Existing test price ID
  mode: stripeMode,
};

// Debug logging
console.log(`Stripe Configuration - Mode: ${stripeConfig.mode}`);
console.log(`Stripe Publishable Key: ${stripeConfig.publishableKey ? stripeConfig.publishableKey.substring(0, 12) + '...' : 'NOT SET'}`);

export default stripeConfig;