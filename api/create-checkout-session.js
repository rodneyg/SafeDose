// Note: Ensure STRIPE_LIVE_SECRET_KEY is set in your deployment environment (e.g., Vercel).
// In Vercel, go to Settings > Environment Variables, add STRIPE_LIVE_SECRET_KEY with your live secret key (sk_live_...), and redeploy the app.

const { createRateLimit } = require('../lib/apiRateLimit');
const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');
const { resolveCheckoutPriceId } = require('../lib/photoCheckStripe');

const allowRequest = createRateLimit(30);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

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

  const { priceId, offerKey, successUrl, cancelUrl, hasTrial } = req.body;
  if ((!priceId && !offerKey) || !successUrl || !cancelUrl) {
    console.log('Missing parameters:', { priceId: Boolean(priceId), offerKey, successUrl: Boolean(successUrl), cancelUrl: Boolean(cancelUrl) });
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    console.log('Attempting to create checkout session with Stripe...');
    const resolved = await resolveCheckoutPriceId(
      stripe,
      { priceId, offerKey },
      { mode: stripeConfig.mode, env: process.env }
    );
    const resolvedPriceId = resolved.priceId;
    // Photo Scan has no trial. Legacy Full Pro price IDs may still pass hasTrial.
    const allowTrial = Boolean(hasTrial) && !resolved.offerKey;

    // Base session configuration
    const sessionConfig = {
      mode: 'subscription',
      line_items: [{ price: resolvedPriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { 
        source: allowTrial ? 'full_pro_trial' : (resolved.offerKey || 'standard_subscription'),
        offerKey: resolved.offerKey || '',
      },
    };

    if (allowTrial) {
      console.log('Adding 7-day trial period for legacy Full Pro plan');
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
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
};