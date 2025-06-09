const Stripe = require('stripe');
const { buffer } = require('micro');
const stripeConfig = require('../lib/stripeConfig.server.js');
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc, getDoc } = require('firebase/firestore');

// Initialize Firebase if not already initialized
if (getApps().length === 0) {
  const firebaseConfig = {
    apiKey: "AIzaSyCOcwQe3AOdanV43iSwYlNxhzSKSRIOq34",
    authDomain: "safedose-e320d.firebaseapp.com",
    projectId: "safedose-e320d",
    storageBucket: "safedose-e320d.firebasestorage.app",
    messagingSenderId: "704055775889",
    appId: "1:704055775889:web:6ff0d3de5fea40b5b56530",
    measurementId: "G-WRY88Q57KK",
  };
  initializeApp(firebaseConfig);
}

const db = getFirestore();

if (!stripeConfig.secretKey) {
  throw new Error(`Stripe secret key is not configured for ${stripeConfig.mode} mode. Please set the appropriate environment variables.`);
}

const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-03-31.basil', // Use a stable, supported version
});

// Helper function to record revenue
const recordRevenue = async (revenueData) => {
  try {
    const revenueRef = doc(db, 'revenue', `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    const revenueRecord = {
      ...revenueData,
      timestamp: new Date(),
      processed: true,
    };
    
    await setDoc(revenueRef, revenueRecord);
    console.log('Revenue recorded:', revenueRecord);
    return revenueRecord;
  } catch (error) {
    console.error('Error recording revenue:', error);
    throw error;
  }
};

// Helper function to update subscription data
const updateSubscriptionData = async (subscriptionData) => {
  try {
    const subscriptionRef = doc(db, 'subscriptions', subscriptionData.subscriptionId);
    await setDoc(subscriptionRef, {
      ...subscriptionData,
      updatedAt: new Date(),
    }, { merge: true });
    
    console.log('Subscription data updated:', subscriptionData);
    return subscriptionData;
  } catch (error) {
    console.error('Error updating subscription data:', error);
    throw error;
  }
};

// Helper function to update user plan
const updateUserPlan = async (customerId, planType, subscriptionStatus) => {
  try {
    // Find user by customer ID
    const usersRef = db.collection('users');
    const userQuery = usersRef.where('customerId', '==', customerId);
    const userSnapshot = await userQuery.get();
    
    if (userSnapshot.empty) {
      console.warn('No user found for customer ID:', customerId);
      return;
    }
    
    const userDoc = userSnapshot.docs[0];
    await updateDoc(userDoc.ref, {
      plan: planType,
      subscriptionStatus,
      updatedAt: new Date(),
    });
    
    console.log('User plan updated:', { customerId, planType, subscriptionStatus });
  } catch (error) {
    console.error('Error updating user plan:', error);
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
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received Stripe webhook event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        
        // Get subscription details
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const customer = await stripe.customers.retrieve(session.customer);
          
          // Determine plan type from price ID
          const priceId = subscription.items.data[0].price.id;
          let planType = 'free';
          if (priceId === process.env.STRIPE_PRICE_ID_PLUS) {
            planType = 'plus';
          } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
            planType = 'pro';
          }
          
          // Record subscription data
          await updateSubscriptionData({
            userId: customer.metadata?.userId || '',
            customerId: session.customer,
            subscriptionId: session.subscription,
            planType,
            status: subscription.status,
            amount: subscription.items.data[0].price.unit_amount / 100,
            currency: subscription.items.data[0].price.currency,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            createdAt: new Date(subscription.created * 1000),
          });
          
          // Update user plan
          await updateUserPlan(session.customer, planType, 'active');
          
          // Record revenue
          await recordRevenue({
            userId: customer.metadata?.userId || '',
            customerId: session.customer,
            amount: subscription.items.data[0].price.unit_amount / 100,
            currency: subscription.items.data[0].price.currency,
            subscriptionId: session.subscription,
            planType,
            transactionType: 'subscription',
          });
        }
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const customer = await stripe.customers.retrieve(invoice.customer);
          
          // Determine plan type
          const priceId = subscription.items.data[0].price.id;
          let planType = 'free';
          if (priceId === process.env.STRIPE_PRICE_ID_PLUS) {
            planType = 'plus';
          } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
            planType = 'pro';
          }
          
          // Record revenue for recurring payments
          await recordRevenue({
            userId: customer.metadata?.userId || '',
            customerId: invoice.customer,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            subscriptionId: invoice.subscription,
            invoiceId: invoice.id,
            planType,
            transactionType: 'subscription',
          });
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        // Determine plan type
        const priceId = subscription.items.data[0].price.id;
        let planType = 'free';
        if (priceId === process.env.STRIPE_PRICE_ID_PLUS) {
          planType = 'plus';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
          planType = 'pro';
        }
        
        // Update subscription data
        await updateSubscriptionData({
          userId: customer.metadata?.userId || '',
          customerId: subscription.customer,
          subscriptionId: subscription.id,
          planType,
          status: subscription.status,
          amount: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          createdAt: new Date(subscription.created * 1000),
        });
        
        // Update user plan
        await updateUserPlan(subscription.customer, planType, subscription.status);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription cancelled:', subscription.id);
        
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        // Update subscription status
        const subscriptionRef = doc(db, 'subscriptions', subscription.id);
        await updateDoc(subscriptionRef, {
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        });
        
        // Update user plan to free
        await updateUserPlan(subscription.customer, 'free', 'cancelled');
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);
        
        if (invoice.subscription) {
          const customer = await stripe.customers.retrieve(invoice.customer);
          
          // Update user subscription status
          await updateUserPlan(invoice.customer, 'free', 'past_due');
        }
        break;
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.status(200).json({ received: true });
};