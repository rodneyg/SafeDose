const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');

module.exports = async (req, res) => {
  console.log('Received request to /api/create-portal-session');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Validate Stripe configuration before proceeding
  if (!stripeConfig.secretKey) {
    console.error('Stripe secret key not configured for', stripeConfig.mode, 'mode');
    return res.status(500).json({ 
      error: `Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`,
    });
  }

  if (!stripeConfig.secretKey.startsWith('sk_')) {
    console.error('Invalid secret key format:', stripeConfig.secretKey.substring(0, 3));
    return res.status(500).json({ 
      error: `Invalid secret key format. Secret keys should start with 'sk_'. Current key starts with: ${stripeConfig.secretKey.substring(0, 3)}`,
    });
  }

  // Initialize Stripe only after validation
  let stripe;
  try {
    stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2022-11-15',
    });
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
    return res.status(500).json({
      error: 'Failed to initialize Stripe configuration',
    });
  }

  try {
    const { customerId, returnUrl } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    // Create the portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl || `${req.headers.origin || 'https://safedose.app'}/settings`,
    });

    console.log('Portal session created successfully:', {
      sessionId: portalSession.id,
      customerId: customerId,
      url: portalSession.url.substring(0, 50) + '...'
    });

    res.status(200).json({ 
      url: portalSession.url,
      sessionId: portalSession.id
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request to Stripe',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create portal session',
      details: error.message 
    });
  }
};