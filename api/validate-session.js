const { billingError, billingFailure, billingRefs, billingUser } = require('../lib/billing.server');
const { createRateLimit } = require('../lib/apiRateLimit');

const allowRequest = createRateLimit(30);
const checkoutSessionId = /^cs_[A-Za-z0-9_]{1,197}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!allowRequest(req, res)) return;

  try {
    const { uid, db } = await billingUser(req);
    const { body } = req;
    if (!body || typeof body !== 'object' || Array.isArray(body) || body.session_id == null) {
      throw billingError(400, 'Missing session_id parameter');
    }
    const id = typeof body.session_id === 'string' ? body.session_id.trim() : '';
    if (!checkoutSessionId.test(id)) throw billingError(400, 'Invalid session_id parameter');
    const refs = billingRefs(db);
    const [checkoutSnapshot, accountSnapshot] = await db.getAll(refs.checkout(id), refs.account(uid));
    const checkout = checkoutSnapshot.data();
    const account = accountSnapshot.data();
    if (!checkout || checkout.uid !== uid || checkout.customerId !== account?.customerId) {
      throw billingError(404, 'Checkout session not found.');
    }
    res.setHeader('Cache-Control', 'no-store');
    if (checkout.status !== 'confirmed') return res.status(200).json({ status: checkout.status, isValid: false });
    const isValid = account.activeSubscriptionIds?.includes(checkout.subscriptionId) === true;
    return res.status(200).json({ status: isValid ? 'active' : 'inactive', isValid });
  } catch (error) {
    return billingFailure(res, 'checkout status', error);
  }
};
