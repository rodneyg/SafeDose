const Stripe = require('stripe');
const admin = require('firebase-admin');
const stripeConfig = require('../lib/stripeConfig.server.js');

const DEFAULT_RETURN_URL = 'https://safe-dose.vercel.app/settings';

function isAllowedReturnUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    return url.hostname === 'safedose.rodneygainous.com' ||
      url.hostname === 'safe-dose.vercel.app' ||
      /^safe-dose-[a-z0-9-]+-rodneygs-projects\.vercel\.app$/.test(url.hostname);
  } catch {
    return false;
  }
}

function getFirebase() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    return null;
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return { auth: admin.auth(), db: admin.firestore() };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.idToken !== 'string' || !body.idToken ||
      Object.keys(body).some(key => key !== 'idToken' && key !== 'returnUrl') ||
      (body.returnUrl !== undefined && !isAllowedReturnUrl(body.returnUrl))) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  const firebase = getFirebase();
  if (!firebase) return res.status(500).json({ error: 'Firebase Admin not configured properly' });

  let identity;
  try {
    identity = await firebase.auth.verifyIdToken(body.idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }

  const userDoc = await firebase.db.collection('users').doc(identity.uid).get();
  const customerId = userDoc.exists && userDoc.data().stripeCustomerId;
  if (!customerId) return res.status(403).json({ error: 'No billing customer found for this user' });

  if (!stripeConfig.secretKey || !stripeConfig.secretKey.startsWith('sk_')) {
    return res.status(500).json({ error: 'Stripe is not configured properly' });
  }

  try {
    const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: '2022-11-15' });
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: body.returnUrl || DEFAULT_RETURN_URL,
    });
    return res.status(200).json({ url: portalSession.url, sessionId: portalSession.id });
  } catch (error) {
    console.error('Error creating portal session:', error);
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid request to Stripe' });
    }
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
};

module.exports.isAllowedReturnUrl = isAllowedReturnUrl;
