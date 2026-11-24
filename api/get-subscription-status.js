const { billingFailure, billingRefs, billingUser } = require('../lib/billing.server');
const { isPaidPlan } = require('../lib/plans');
const { createRateLimit } = require('../lib/apiRateLimit');

const allowRequest = createRateLimit(30);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  try {
    const { uid, db } = await billingUser(req);
    const account = (await billingRefs(db).account(uid).get()).data();
    const subscription = account?.subscription || null;
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      hasActiveSubscription: isPaidPlan(account?.plan),
      subscriptionStatus: subscription?.status || 'none',
      plan: account?.plan || 'free',
      customerId: account?.customerId || null,
      subscription,
    });
  } catch (error) {
    return billingFailure(res, 'subscription status', error);
  }
};
