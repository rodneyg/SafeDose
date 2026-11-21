const { billingError, billingFailure, billingRefs, billingUser } = require('../lib/billing.server');
const { stripeId } = require('../lib/stripeFulfillment.server');
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
    const id = stripeId(req.body?.session_id, 'cs_');
    if (!id) throw billingError(400, 'A checkout session is required.');
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
