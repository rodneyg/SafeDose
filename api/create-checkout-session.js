// Note: Ensure STRIPE_LIVE_SECRET_KEY is set in your deployment environment (e.g., Vercel).
// In Vercel, go to Settings > Environment Variables, add STRIPE_LIVE_SECRET_KEY with your live secret key (sk_live_...), and redeploy the app.

const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');

// Version logging for deployment verification
console.log('create-checkout-session.js Version: 1.2 (with enhanced logging)');

// Enhanced error checking and logging
console.log('Loading create-checkout-session with config:', {
  mode: stripeConfig.mode,
  hasSecretKey: !!stripeConfig.secretKey,
  secretKeyFormat: stripeConfig.secretKey ? (stripeConfig.secretKey.startsWith('sk_') ? 'valid' : 'invalid') : 'missing'
});

module.exports = async (req, res) => {
  // Direct environment variable logging for diagnostics
  const stripeMode = process.env.STRIPE_MODE || 'test';
  const isLiveMode = stripeMode === 'live';
  
  console.log('Environment variable diagnostic:', {
    STRIPE_MODE: stripeMode,
    isLiveMode: isLiveMode,
    STRIPE_LIVE_SECRET_KEY: isLiveMode ? 
      (process.env.STRIPE_LIVE_SECRET_KEY ? 'Set (value redacted)' : 'Not Set') :
      'Not applicable (test mode)',
    STRIPE_TEST_SECRET_KEY: !isLiveMode ? 
      (process.env.STRIPE_TEST_SECRET_KEY ? 'Set (value redacted)' : 'Not Set') :
      'Not applicable (live mode)'
  });

  console.log('Received request to /api/create-checkout-session:', req.body);
  console.log('Stripe config being used:', {
    mode: stripeConfig.mode,
    hasSecretKey: !!stripeConfig.secretKey,
    secretKeyPrefix: stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 7) : 'N/A'
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate Stripe configuration before proceeding
  if (!stripeConfig.secretKey) {
    const envVarName = stripeConfig.mode === 'live' ? 'STRIPE_LIVE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
    console.error(`Stripe secret key not configured for ${stripeConfig.mode} mode. Environment variable ${envVarName} is missing or undefined.`);
    console.error('Deployment guidance: In Vercel, go to Settings > Environment Variables and add the missing key.');
    return res.status(500).json({ 
      error: `Payment system not configured for ${stripeConfig.mode} mode. Please contact support.`,
      details: `Missing environment variable: ${envVarName}. Please check your deployment configuration.`
    });
  }

  // Additional validation to ensure we're not using a publishable key as secret key
  if (stripeConfig.secretKey.startsWith('pk_')) {
    console.error('CRITICAL: A publishable key was provided as secret key');
    return res.status(500).json({ 
      error: 'CRITICAL: A publishable key was provided as secret key. This will cause API failures. Please check your environment configuration.' 
    });
  }

  if (!stripeConfig.secretKey.startsWith('sk_')) {
    console.error('Invalid secret key format:', stripeConfig.secretKey.substring(0, 3));
    return res.status(500).json({ 
      error: `Invalid secret key format. Secret keys should start with 'sk_'. Current key starts with: ${stripeConfig.secretKey.substring(0, 3)}` 
    });
  }

  // Initialize Stripe only after validation
  let stripe;
  try {
    stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2022-11-15',
    });
  } catch (stripeInitError) {
    console.error('Failed to initialize Stripe:', stripeInitError.message);
    return res.status(500).json({ 
      error: 'Failed to initialize payment system. Please contact support.' 
    });
  }

  const { priceId, successUrl, cancelUrl } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    console.log('Missing parameters:', { priceId, successUrl, cancelUrl });
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    console.log('Attempting to create checkout session with Stripe...');
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    console.log('Created checkout session:', session.id);
    res.status(200).json({ sessionId: session.id });
  } catch (err) {
    console.error('Error creating checkout session:', err.message);
    console.error('Error type:', err.type);
    console.error('Error code:', err.code);
    console.error('Full error object:', err);
    res.status(500).json({ error: err.message });
  }
};