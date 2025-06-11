const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server.js');

if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}

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

  // Handle different webhook events
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Received event:', event.type, session.id);
      console.log('Session metadata:', session.metadata);
      // TODO: Update database (e.g., Firestore) with subscription info
      break;
      
    case 'customer.subscription.trial_will_end':
      const subscription = event.data.object;
      console.log('Trial ending soon for subscription:', subscription.id);
      // TODO: Send email reminder at day 5 of trial
      // TODO: Track trial conversion analytics
      break;
      
    case 'customer.subscription.created':
      const newSubscription = event.data.object;
      console.log('New subscription created:', newSubscription.id);
      if (newSubscription.trial_end) {
        console.log('Subscription has trial ending at:', new Date(newSubscription.trial_end * 1000));
        // TODO: Track trial sign-up analytics with source: full_pro_trial
      }
      break;
      
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      console.log('Subscription updated:', updatedSubscription.id);
      // TODO: Handle trial to paid conversion
      break;
      
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Subscription cancelled:', deletedSubscription.id);
      // TODO: Track cancellation analytics
      break;
      
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};