const Stripe = require('stripe');

// Use environment variables directly for better reliability in serverless context
const stripeSecretKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Stripe secret key is not configured. Please set STRIPE_LIVE_SECRET_KEY environment variable.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2022-11-15',
});

module.exports = async (req, res) => {
  console.log('Received request to /api/create-checkout-session:', req.body);

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
    res.status(500).json({ error: err.message });
  }
};