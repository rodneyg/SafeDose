const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');

// Try to initialize Firebase Admin if environment variables are available
let admin = null;
let db = null;

try {
  admin = require('firebase-admin');
  
  // Only initialize if credentials are available
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    db = admin.firestore();
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase Admin credentials not available, user authentication will be limited');
  }
} catch (error) {
  console.warn('Firebase Admin not available:', error.message);
}

module.exports = async (req, res) => {
  console.log('Received request to /api/get-subscription-status');

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
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    if (!admin || !db) {
      return res.status(500).json({ error: 'Firebase Admin not configured properly' });
    }

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error('Invalid ID token:', error);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const userId = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(200).json({ 
        hasActiveSubscription: false,
        subscriptionStatus: 'none',
        plan: 'free',
        customerId: null
      });
    }

    const userData = userDoc.data();
    const customerId = userData.stripeCustomerId;

    if (!customerId) {
      return res.status(200).json({ 
        hasActiveSubscription: false,
        subscriptionStatus: 'none',
        plan: userData.plan || 'free',
        customerId: null
      });
    }

    // Get customer and subscription data from Stripe
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['subscriptions']
    });

    let hasActiveSubscription = false;
    let subscriptionStatus = 'none';
    let currentPlan = userData.plan || 'free';
    let subscriptionData = null;

    if (customer.subscriptions && customer.subscriptions.data.length > 0) {
      const subscription = customer.subscriptions.data[0]; // Get the first subscription
      subscriptionStatus = subscription.status;
      hasActiveSubscription = ['active', 'trialing'].includes(subscription.status);
      
      if (hasActiveSubscription && subscription.items.data.length > 0) {
        const priceId = subscription.items.data[0].price.id;
        
        // Map price IDs to plan names (you can extend this based on your pricing)
        const planMapping = {
          'price_1RYgx7AY2p4W374YR9UxS0vr': 'starter', // Monthly Starter
          'price_1RYgx7AY2p4W374Yy23EtyIm': 'starter', // Annual Starter
          'price_1RYgyPAY2p4W374YNbpBpbqv': 'basic-pro', // Monthly Basic Pro
          'price_1RYgyPAY2p4W374YJOhwDafY': 'basic-pro', // Annual Basic Pro
          'price_1RUHgxAY2p4W374Yb5EWEtZ0': 'full-pro', // Monthly Full Pro
          'price_1RYgzUAY2p4W374YHiBBHvuX': 'full-pro', // Annual Full Pro
        };
        
        currentPlan = planMapping[priceId] || 'pro';
      }
      
      subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId: subscription.items.data[0]?.price?.id,
      };
    }

    console.log('Subscription status retrieved:', {
      userId,
      customerId,
      hasActiveSubscription,
      subscriptionStatus,
      plan: currentPlan
    });

    res.status(200).json({ 
      hasActiveSubscription,
      subscriptionStatus,
      plan: currentPlan,
      customerId,
      subscription: subscriptionData
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Invalid request to Stripe',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to get subscription status',
      details: error.message 
    });
  }
};