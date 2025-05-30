const Stripe = require('stripe');
const { buffer } = require('micro');

// Use environment variables directly for better reliability in serverless context
const stripeSecretKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('Stripe secret key is not configured. Please set STRIPE_LIVE_SECRET_KEY environment variable.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-03-31.basil', // Use a stable, supported version
});

module.exports = async (req, res) => {
  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('Received event:', event.type, session.id);
    // TODO: Update database (e.g., Firestore)
  }

  res.status(200).json({ received: true });
};