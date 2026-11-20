const { URL } = require('node:url');
const { createHash } = require('node:crypto');
const Stripe = require('stripe');
const stripeConfig = require('./stripeConfig.server');
const { getBillingFirebase } = require('./firebaseAdmin.server');

function billingError(status, message) {
  return Object.assign(new Error(message), { billingStatus: status });
}

function billingStripe() {
  const mode = stripeConfig.mode;
  if (!new RegExp(`^(sk|rk)_${mode}_`).test(stripeConfig.secretKey || '')) {
    throw billingError(503, 'Payments are temporarily unavailable.');
  }
  return new Stripe(stripeConfig.secretKey, { apiVersion: '2025-03-31.basil', timeout: 10000, maxNetworkRetries: 1 });
}

function billingRefs(db, mode = stripeConfig.mode) {
  const root = db.collection('stripeBilling').doc(mode);
  return {
    account: (uid) => root.collection('accounts').doc(encodeURIComponent(uid)),
    customer: (id) => root.collection('customers').doc(id),
    checkout: (id) => root.collection('checkouts').doc(id),
    event: (id) => root.collection('events').doc(id),
  };
}

async function billingUser(req) {
  const authorization = req.headers?.authorization;
  const token = typeof authorization === 'string'
    ? /^Bearer ([^\s]+)$/i.exec(authorization)?.[1]
    : req.body?.idToken; // Existing settings clients send it in the body.
  if (typeof token !== 'string' || !token) {
    throw billingError(401, 'Sign in to your SafeDose account.');
  }

  const { auth, db } = getBillingFirebase();
  let user;
  try {
    user = await auth.verifyIdToken(token, true);
  } catch (error) {
    if (['auth/argument-error', 'auth/invalid-id-token', 'auth/id-token-expired',
      'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found'].includes(error.code)) {
      throw billingError(401, 'Sign in to your SafeDose account.');
    }
    throw error;
  }
  if (!user.uid || !user.firebase?.sign_in_provider || user.firebase.sign_in_provider === 'anonymous') {
    throw billingError(401, 'Sign in to your SafeDose account.');
  }
  return { uid: user.uid, db };
}

async function getOrCreateCustomer(stripe, db, uid) {
  const refs = billingRefs(db);
  const accountRef = refs.account(uid);
  const account = await accountRef.get();
  if (account.data()?.customerId) return account.data().customerId;

  const key = createHash('sha256').update(`${process.env.FIREBASE_PROJECT_ID}:${uid}`).digest('hex');
  const customer = await stripe.customers.create({ metadata: { safeDoseUid: uid } }, {
    idempotencyKey: `safedose-customer-${key}`,
  });

  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(accountRef);
    if (current.data()?.customerId) return current.data().customerId;
    transaction.create(refs.customer(customer.id), { uid });
    transaction.set(accountRef, { customerId: customer.id }, { merge: true });
    return customer.id;
  });
}

function billingReturnOrigin(url, path) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw billingError(400, 'Invalid return URL.');
  }
  const local = process.env.VERCEL_ENV !== 'production' &&
    parsed.hostname === 'localhost' && ['http:', 'https:'].includes(parsed.protocol);
  const hosted = parsed.protocol === 'https:' && !parsed.port &&
    (['safedose.rodneygainous.com', 'safe-dose.vercel.app'].includes(parsed.hostname) ||
      /^safe-dose-[a-z0-9-]+-rodneygs-projects\.vercel\.app$/.test(parsed.hostname));
  if ((!hosted && !local) || parsed.username || parsed.password || parsed.pathname !== path) {
    throw billingError(400, 'Invalid return URL.');
  }
  return parsed.origin;
}

function billingFailure(res, operation, error) {
  if (error.billingStatus) return res.status(error.billingStatus).json({ error: error.message });
  console.error(`[billing] ${operation} failed`);
  return res.status(503).json({ error: 'Payments are temporarily unavailable.' });
}

module.exports = {
  billingError, billingFailure, billingRefs, billingReturnOrigin, billingStripe, billingUser, getOrCreateCustomer,
};
