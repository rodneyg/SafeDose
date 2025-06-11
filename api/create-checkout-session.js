// Note: Ensure STRIPE_LIVE_SECRET_KEY is set in your deployment environment (e.g., Vercel).
// In Vercel, go to Settings > Environment Variables, add STRIPE_LIVE_SECRET_KEY with your live secret key (sk_live_...), and redeploy the app.

const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig');

// Enhanced error checking and logging
console.log('create-checkout-session.js Version: 1.6 (deployed with process.env fix)');
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
      (process.env.STRIPE_LIVE_SECRET_KEY ? `Set (value: ${process.env.STRIPE_LIVE_SECRET_KEY.substring(0, 12)}...)` : 'NOT SET') :
      'Not applicable (test mode)',
    STRIPE_TEST_SECRET_KEY: !isLiveMode ? 
      (process.env.STRIPE_TEST_SECRET_KEY ? `Set (value: ${process.env.STRIPE_TEST_SECRET_KEY.substring(0, 12)}...)` : 'NOT SET') :
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
    console.error('Deployment guidance: In Vercel, go to Settings > Environment Variables, add the missing key under the Production environment, and redeploy with `vercel --prod`.');
    return res.status(500).json({ 
      error: `Payment system not configured for ${stripeConfig.mode} mode. Please contact support.`,
      details: `Missing environment variable: ${envVarName}. Please check your Vercel Production environment configuration.`
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

  const { priceId, successUrl, cancelUrl, hasTrial } = req.body;
  if (!priceId || !successUrl || !cancelUrl) {
    console.log('Missing parameters:', { priceId, successUrl, cancelUrl });
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    console.log('Attempting to create checkout session with Stripe...');
    
    // Base session configuration
    const sessionConfig = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { 
        source: hasTrial ? 'full_pro_trial' : 'standard_subscription'
      },
    };

    // Add trial period for Full Pro plans (both monthly and yearly)
    if (hasTrial) {
      console.log('Adding 7-day trial period for Full Pro plan');
      sessionConfig.subscription_data = {
        trial_period_days: 7,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
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