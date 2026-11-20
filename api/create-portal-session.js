const { billingError, billingFailure, billingRefs, billingReturnOrigin, billingStripe, billingUser } = require('../lib/billing.server');
const { PRODUCTION_API_BASE_URL } = require('../lib/apiBase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { uid, db } = await billingUser(req);
    const account = (await billingRefs(db).account(uid).get()).data();
    if (!account?.customerId) throw billingError(404, 'No subscription to manage.');
    const origin = billingReturnOrigin(req.body?.returnUrl || `${PRODUCTION_API_BASE_URL}/settings`, '/settings');
    const { url, id } = await billingStripe().billingPortal.sessions.create({
      customer: account.customerId,
      return_url: `${origin}/settings`,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ url, sessionId: id });
  } catch (error) {
    return billingFailure(res, 'billing portal', error);
  }
};
