const { billingRefs } = require('./billing.server');
const { isPaidPlan, mapPriceIdToPlan } = require('./plans');

const checkoutEvents = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);
const subscriptionEvents = new Set([
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'customer.subscription.paused', 'customer.subscription.resumed',
  'invoice.paid', 'invoice.payment_failed',
]);

function stripeId(object, prefix) {
  const id = typeof object === 'string' ? object : object?.id;
  return typeof id === 'string' && id.startsWith(prefix) && /^[a-zA-Z0-9_]+$/.test(id) ? id : null;
}

async function reconcileSubscriptions(stripe, customerId, fulfilled) {
  const activeSubscriptionIds = [];
  let activeSubscription;
  let latestSubscription;
  if (fulfilled.size > 0) {
    for await (const subscription of stripe.subscriptions.list({ customer: customerId, status: 'all' })) {
      if (!fulfilled.has(subscription.id)) continue;
      const items = subscription.items.data;
      const item = items.find(({ price }) => isPaidPlan(mapPriceIdToPlan(price.id, process.env, price.lookup_key)));
      const plan = item ? mapPriceIdToPlan(item.price.id, process.env, item.price.lookup_key) : 'free';
      const current = {
        id: subscription.id,
        plan,
        status: subscription.status,
        currentPeriodEnd: item?.current_period_end ?? subscription.current_period_end ?? null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        priceId: item?.price.id ?? null,
      };
      latestSubscription ??= current;
      if (item && ['active', 'trialing'].includes(current.status)) {
        activeSubscription ??= current;
        activeSubscriptionIds.push(current.id);
      }
    }
  }

  return {
    plan: activeSubscription?.plan || 'free',
    subscription: activeSubscription || latestSubscription || null,
    activeSubscriptionIds,
  };
}

async function fulfillStripeEvent(stripe, db, mode, event) {
  const isCheckout = checkoutEvents.has(event.type);
  if (!isCheckout && !subscriptionEvents.has(event.type)) return;

  const object = event.data.object;
  const eventId = stripeId(event, 'evt_');
  const customerId = stripeId(object.customer, 'cus_');
  if (!customerId || !eventId) return;

  const refs = billingRefs(db, mode);
  const eventRef = refs.event(eventId);
  const mapping = (await refs.customer(customerId).get()).data();
  if (!mapping || (await eventRef.get()).exists) return;

  const accountRef = refs.account(mapping.uid);
  const checkoutId = isCheckout ? stripeId(object, 'cs_') : null;
  if (isCheckout && !checkoutId) return;
  const checkoutRef = checkoutId ? refs.checkout(checkoutId) : null;
  const failed = ['checkout.session.async_payment_failed', 'checkout.session.expired'].includes(event.type);
  const subscriptionId = isCheckout ? stripeId(object.subscription, 'sub_') : null;

  // Re-read Stripe after a competing write. Firestore may retry the transaction
  // callback, so Stripe requests stay outside it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const account = (await accountRef.get()).data();
    if (account?.customerId !== customerId) return;
    const checkout = checkoutRef ? (await checkoutRef.get()).data() : null;
    if (isCheckout && (checkout?.uid !== mapping.uid || checkout.customerId !== customerId ||
        object.client_reference_id !== mapping.uid || object.mode !== 'subscription')) return;

    const confirmed = isCheckout && !failed && object.status === 'complete' && subscriptionId &&
      (object.payment_status === 'paid' || (checkout.trial && object.payment_status === 'no_payment_required'));
    if (isCheckout && !failed && !confirmed) return;

    const fulfilled = new Set(account.fulfilledSubscriptions || []);
    if (confirmed) fulfilled.add(subscriptionId);

    const entitlement = failed ? null : await reconcileSubscriptions(stripe, customerId, fulfilled);
    const committed = await db.runTransaction(async (transaction) => {
      const seen = await transaction.get(eventRef);
      if (seen.exists) return true;
      const current = (await transaction.get(accountRef)).data();
      if (current?.customerId !== customerId || current.revision !== account.revision) return false;

      if (checkoutRef) {
        if (confirmed) transaction.update(checkoutRef, { status: 'confirmed', subscriptionId });
        else if (checkout.status !== 'confirmed') transaction.update(checkoutRef, { status: 'failed' });
      }
      transaction.update(accountRef, {
        ...(entitlement && { ...entitlement, fulfilledSubscriptions: [...fulfilled] }),
        revision: (account.revision || 0) + 1,
      });
      transaction.create(eventRef, { type: event.type, receivedAt: new Date() });
      return true;
    });
    if (committed) return;
  }

  throw new Error('Billing state changed during webhook processing');
}

module.exports = { fulfillStripeEvent, stripeId };
