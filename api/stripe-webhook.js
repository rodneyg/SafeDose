const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server');
const { billingStripe } = require('../lib/billing.server');
const { getBillingFirebase } = require('../lib/firebaseAdmin.server');
const { fulfillStripeEvent } = require('../lib/stripeFulfillment.server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') return res.status(400).json({ error: 'Invalid Stripe signature.' });
  if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
    return res.status(503).json({ error: 'Webhook is temporarily unavailable.' });
  }

  let event;
  try {
    event = Stripe.webhooks.constructEvent(await buffer(req), signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).json({ error: 'Invalid Stripe signature.' });
  }
  if (event.livemode !== (stripeConfig.mode === 'live')) {
    return res.status(400).json({ error: 'Webhook mode mismatch.' });
  }

  try {
    await fulfillStripeEvent(billingStripe(), getBillingFirebase().db, stripeConfig.mode, event);
    return res.status(200).json({ received: true });
  } catch {
    console.error('[billing] webhook processing failed', event.id, event.type);
    return res.status(503).json({ error: 'Webhook is temporarily unavailable.' });
  }
};
