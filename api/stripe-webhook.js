const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server.js');

if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-03-31.basil', // Use a stable, supported version
});

// Enhanced server-side analytics logging (Firebase Analytics would be initialized client-side)
const logAnalyticsEvent = (eventName, parameters) => {
  const analyticsData = {
    timestamp: new Date().toISOString(),
    platform: 'server',
    event: eventName,
    parameters: parameters || {},
  };
  
  console.log(`[Analytics][Server] ${JSON.stringify(analyticsData)}`);
  
  // Note: In a real implementation, you could:
  // 1. Send this to Firebase Analytics via the Firebase Admin SDK
  // 2. Queue for client-side processing when user next visits
  // 3. Send to a dedicated analytics service endpoint
  // 4. Store in database for later batch processing
};

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
    
    // Log subscription started event for analytics
    logAnalyticsEvent('subscription_started', {
      plan_type: 'plus', // assuming plus plan for now
      amount: session.amount_total / 100, // convert from cents
      currency: session.currency,
    });
    
    // TODO: Update database (e.g., Firestore)
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    console.log('Subscription cancelled:', subscription.id);
    
    // Log subscription cancelled event for analytics
    logAnalyticsEvent('subscription_cancelled', {
      plan_type: 'plus',
      cancellation_reason: subscription.cancellation_details?.reason || 'unknown',
    });
  }

  res.status(200).json({ received: true });
};