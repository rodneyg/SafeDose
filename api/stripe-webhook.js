const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server.js');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-03-31.basil', // Use a stable, supported version
});

// Firebase configuration (server-side)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "safedose-e320d.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "safedose-e320d",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "safedose-e320d.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "704055775889",
  appId: process.env.FIREBASE_APP_ID || "1:704055775889:web:6ff0d3de5fea40b5b56530",
  measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-WRY88Q57KK",
};

// Initialize Firebase app (only if not already initialized)
let app;
let db;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
} catch (error) {
  console.warn('[Analytics][Firebase] Failed to initialize Firebase:', error);
  db = null;
}

// Server-side analytics logging that stores events in Firestore
const logAnalyticsEvent = async (eventName, parameters) => {
  try {
    if (!db) {
      console.warn('[Analytics][Server] Firestore not available, falling back to console logging');
      throw new Error('Firestore not initialized');
    }

    // Create analytics event document
    const analyticsEvent = {
      eventName,
      parameters: parameters || {},
      platform: 'server',
      timestamp: new Date().toISOString(),
      createdAt: new Date(),
    };

    // Store in Firestore analytics collection
    const analyticsCollection = collection(db, 'analytics_events');
    const docRef = await addDoc(analyticsCollection, analyticsEvent);

    console.log(`[Analytics][Server] Event stored in Firestore: ${eventName}`, {
      docId: docRef.id,
      parameters: analyticsEvent.parameters
    });

    return true;
  } catch (error) {
    console.error(`[Analytics][Server] Error storing event ${eventName}:`, error);
    
    // Fallback to console logging if Firestore storage fails
    console.log(`[Analytics][Server][Fallback] ${JSON.stringify({
      timestamp: new Date().toISOString(),
      platform: 'server',
      event: eventName,
      parameters: parameters || {},
    })}`);
    
    return false;
  }
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
    await logAnalyticsEvent('subscription_started', {
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
    await logAnalyticsEvent('subscription_cancelled', {
      plan_type: 'plus',
      cancellation_reason: subscription.cancellation_details?.reason || 'unknown',
    });
  }

  res.status(200).json({ received: true });
};