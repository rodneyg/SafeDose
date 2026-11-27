const {
  billingError, billingFailure, billingRefs, billingReturnOrigin, billingStripe, billingUser, getOrCreateCustomer,
} = require('../lib/billing.server');
const stripeConfig = require('../lib/stripeConfig.server');
const { createRateLimit } = require('../lib/apiRateLimit');
const { resolveCheckoutPriceId } = require('../lib/photoCheckStripe');
const { mapPriceIdToPlan } = require('../lib/plans');

const allowRequest = createRateLimit(30);

async function listCustomerSubscriptions(stripe, customerId) {
  const subscriptions = [];
  let startingAfter;
  while (true) {
    const page = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    subscriptions.push(...(page.data || []));
    if (!page.has_more) return subscriptions;
    startingAfter = page.data?.at(-1)?.id;
    if (!startingAfter) throw new Error('Stripe returned an incomplete subscriptions page');
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  const { body } = req;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }
  const { priceId, offerKey, successUrl, cancelUrl, hasTrial } = body;
  if ((!priceId && !offerKey) ||
      (priceId != null && typeof priceId !== 'string') ||
      (offerKey != null && typeof offerKey !== 'string')) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
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
    const customerId = await getOrCreateCustomer(stripe, db, uid);
    const subscriptions = await listCustomerSubscriptions(stripe, customerId);
    if (subscriptions.some(subscription => ['active', 'trialing'].includes(subscription.status))) {
      throw billingError(409, 'You already have an active subscription.');
    }
    const hadTrial = subscriptions.some(subscription => subscription.trial_start != null);
    const trial = hasTrial === true && !hadTrial && !resolved.offerKey && mapPriceIdToPlan(resolved.priceId) === 'full-pro';
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
    const sessionUrl = typeof session.url === 'string' ? session.url : '';
    let parsedSessionUrl;
    try {
      parsedSessionUrl = new URL(sessionUrl);
    } catch {
      throw billingError(503, 'Payments are temporarily unavailable.');
    }
    if (parsedSessionUrl.protocol !== 'https:' || parsedSessionUrl.username || parsedSessionUrl.password) {
      throw billingError(503, 'Payments are temporarily unavailable.');
    }
    await billingRefs(db).checkout(session.id).create({ uid, customerId, trial, status: 'pending' });
    return res.status(200).json({ sessionId: session.id, url: parsedSessionUrl.toString() });
  } catch (error) {
    if (error.statusCode === 400 && !error.type) {
      return res.status(400).json({ error: 'Unsupported checkout offer.' });
    }
    return billingFailure(res, 'checkout', error);
  }
};
