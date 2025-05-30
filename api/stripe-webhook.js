const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server');

const stripe = new Stripe(stripeConfig.secretKey, {
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