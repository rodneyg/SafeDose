const { URL } = require('node:url');
const { billingError, billingFailure, billingRefs, billingReturnOrigin, billingStripe, billingUser } = require('../lib/billing.server');
const { PRODUCTION_API_BASE_URL } = require('../lib/apiBase');
const { createRateLimit } = require('../lib/apiRateLimit');

const allowRequest = createRateLimit(30);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  const { body } = req;
  if (body !== undefined && (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some(key => key !== 'idToken' && key !== 'returnUrl') ||
      (body.idToken !== undefined && typeof body.idToken !== 'string'))) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const returnUrl = body?.returnUrl === undefined ? `${PRODUCTION_API_BASE_URL}/settings` : body.returnUrl;
    billingReturnOrigin(returnUrl, '/settings', { allowLocal: false });
    const { uid, db } = await billingUser(req);
    const account = (await billingRefs(db).account(uid).get()).data();
    if (!account?.customerId) throw billingError(404, 'No subscription to manage.');
    const { url, id } = await billingStripe().billingPortal.sessions.create({
      customer: account.customerId,
      return_url: new URL(returnUrl).href,
    });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ url, sessionId: id });
  } catch (error) {
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid request to Stripe' });
    }
    return billingFailure(res, 'billing portal', error);
  }
};
