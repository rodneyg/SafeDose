const { createRateLimit } = require('../lib/apiRateLimit');
const Stripe = require('stripe');
const stripeConfig = require('../lib/stripeConfig.server.js');

const allowRequest = createRateLimit(30);
const checkoutSessionId = /^cs_[A-Za-z0-9_]+$/;
const sessionError = { error: 'Unable to validate checkout session', isValid: false };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  const { body } = req;
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.session_id == null) {
    return res.status(400).json({ error: 'Missing session_id parameter', isValid: false });
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (sessionId.length > 200 || !checkoutSessionId.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid session_id parameter', isValid: false });
  }

  const { secretKey } = stripeConfig;
  if (typeof secretKey !== 'string' || !secretKey.startsWith('sk_') || secretKey.length === 3) {
    console.error('Invalid Stripe configuration for session validation');
    return res.status(500).json({ error: 'Payment system unavailable', isValid: false });
  }

  let stripe;
  try {
    stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' });
  } catch {
    console.error('Failed to initialize Stripe for session validation');
    return res.status(500).json(sessionError);
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    console.error('Failed to retrieve Stripe checkout session');
    return res.status(500).json(sessionError);
  }

  const paymentStatus = session?.payment_status;
  const mode = session?.mode;
  return res.status(200).json({
    isValid: paymentStatus === 'paid' && mode === 'subscription',
    paymentStatus,
    mode,
  });
};
