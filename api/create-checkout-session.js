const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');

// Enhanced error checking and logging
console.log('Loading create-checkout-session with config:', {
  mode: stripeConfig.mode,
  hasSecretKey: !!stripeConfig.secretKey,
  secretKeyFormat: stripeConfig.secretKey ? (stripeConfig.secretKey.startsWith('sk_') ? 'valid' : 'invalid') : 'missing'
});

if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}

// Additional validation to ensure we're not using a publishable key as secret key
if (stripeConfig.secretKey.startsWith('pk_')) {
  throw new Error(`CRITICAL: A publishable key was provided as secret key. This will cause API failures. Please check your environment configuration.`);
}

if (!stripeConfig.secretKey.startsWith('sk_')) {
  throw new Error(`Invalid secret key format. Secret keys should start with 'sk_'. Current key starts with: ${stripeConfig.secretKey.substring(0, 3)}`);
}

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2022-11-15',
});

module.exports = async (req, res) => {
  console.log('Received request to /api/create-checkout-session:', req.body);
  console.log('Stripe config being used:', {
    mode: stripeConfig.mode,
    hasSecretKey: !!stripeConfig.secretKey,
    secretKeyPrefix: stripeConfig.secretKey ? stripeConfig.secretKey.substring(0, 7) : 'N/A'
  });

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
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