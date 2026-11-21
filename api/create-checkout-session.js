const {
  billingError, billingFailure, billingRefs, billingReturnOrigin, billingStripe, billingUser, getOrCreateCustomer,
} = require('../lib/billing.server');
const stripeConfig = require('../lib/stripeConfig.server');
const { createRateLimit } = require('../lib/apiRateLimit');
const { resolveCheckoutPriceId } = require('../lib/photoCheckStripe');
const { mapPriceIdToPlan } = require('../lib/plans');

const allowRequest = createRateLimit(30);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  try {
    const { priceId, offerKey, successUrl, cancelUrl, hasTrial } = req.body || {};
    if ((!priceId && !offerKey) || !successUrl || !cancelUrl) {
      throw billingError(400, 'Missing parameters');
    }
    const origin = billingReturnOrigin(successUrl, '/success');
    if (billingReturnOrigin(cancelUrl, '/pricing') !== origin) {
      throw billingError(400, 'Invalid return URL.');
    }
    const { uid, db } = await billingUser(req);
    if (!process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')) {
      throw billingError(503, 'Payments are temporarily unavailable.');
    }

    const stripe = billingStripe();
    const resolved = await resolveCheckoutPriceId(stripe, { priceId, offerKey }, { mode: stripeConfig.mode });
    const trial = hasTrial === true && !resolved.offerKey && mapPriceIdToPlan(resolved.priceId) === 'full-pro';
    const customerId = await getOrCreateCustomer(stripe, db, uid);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: uid,
      line_items: [{ price: resolved.priceId, quantity: 1 }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { offerKey: resolved.offerKey || '', source: trial ? 'full_pro_trial' : (resolved.offerKey || 'standard_subscription') },
      ...(trial ? { subscription_data: { trial_period_days: 7 } } : {}),
    });
    await billingRefs(db).checkout(session.id).create({ uid, customerId, trial, status: 'pending' });
    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    if (error.statusCode === 400 && !error.type) {
      return res.status(400).json({ error: 'Unsupported checkout offer.' });
    }
    return billingFailure(res, 'checkout', error);
  }
};
