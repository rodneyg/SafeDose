/* eslint-env jest */

const mockBillingRefs = jest.fn();
const mockIsPaidPlan = jest.fn(plan => plan !== 'free');
const mockMapPriceIdToPlan = jest.fn((priceId, _env, lookupKey) =>
  lookupKey === 'paid_lookup' || priceId === 'price_paid' ? 'photo-check' : 'free');

jest.mock('./billing.server', () => ({ billingRefs: (...args) => mockBillingRefs(...args) }));
jest.mock('./plans', () => ({
  isPaidPlan: (...args) => mockIsPaidPlan(...args),
  mapPriceIdToPlan: (...args) => mockMapPriceIdToPlan(...args),
}));

const { fulfillStripeEvent, stripeId } = require('./stripeFulfillment.server');

function snapshot(data, exists = data !== undefined) {
  return { exists, data: () => data };
}

function subscription({ id = 'sub_paid', status = 'active', priceId = 'price_paid',
  lookupKey, itemPeriodEnd = 123, subscriptionPeriodEnd = 456 } = {}) {
  return {
    id,
    status,
    current_period_end: subscriptionPeriodEnd,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: priceId, lookup_key: lookupKey }, current_period_end: itemPeriodEnd }] },
  };
}

function event(type = 'checkout.session.completed', object = {}) {
  return {
    id: 'evt_valid',
    type,
    data: {
      object: {
        id: 'cs_valid',
        customer: 'cus_valid',
        subscription: 'sub_paid',
        client_reference_id: 'user-1',
        mode: 'subscription',
        status: 'complete',
        payment_status: 'paid',
        ...object,
      },
    },
  };
}

function setup({ mapping = { uid: 'user-1' }, account = {
  customerId: 'cus_valid', revision: 2, fulfilledSubscriptions: [],
}, checkout = { uid: 'user-1', customerId: 'cus_valid', trial: false, status: 'pending' },
eventExists = false, currentAccount, transactionEventExists = false } = {}) {
  const refs = {
    customer: jest.fn(() => ({ kind: 'customer', get: jest.fn(async () => snapshot(mapping)) })),
    account: jest.fn(() => ({ kind: 'account', get: jest.fn(async () => snapshot(account)) })),
    checkout: jest.fn(() => ({ kind: 'checkout', get: jest.fn(async () => snapshot(checkout)) })),
    event: jest.fn(() => ({ kind: 'event', get: jest.fn(async () => snapshot(undefined, eventExists)) })),
  };
  mockBillingRefs.mockReturnValue(refs);

  const transaction = {
    get: jest.fn(async ref => {
      if (ref.kind === 'event') return snapshot(undefined, transactionEventExists);
      if (ref.kind === 'account') return snapshot(currentAccount || account);
      throw new Error(`Unexpected transaction read: ${ref.kind}`);
    }),
    update: jest.fn(),
    create: jest.fn(),
  };
  const db = { runTransaction: jest.fn(async callback => callback(transaction)) };
  return { db, refs, transaction };
}

function stripeWith(...subscriptions) {
  return {
    subscriptions: {
      list: jest.fn(() => (async function* () { yield* subscriptions; })()),
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsPaidPlan.mockImplementation(plan => plan !== 'free');
  mockMapPriceIdToPlan.mockImplementation((priceId, _env, lookupKey) =>
    lookupKey === 'paid_lookup' || priceId === 'price_paid' ? 'photo-check' : 'free');
});

describe('stripeId', () => {
  it.each([
    ['a matching string', 'evt_ABC123', 'evt_', 'evt_ABC123'],
    ['an object id', { id: 'cus_123' }, 'cus_', 'cus_123'],
    ['the wrong prefix', 'cus_123', 'evt_', null],
    ['punctuation', 'evt_bad-value', 'evt_', null],
    ['a missing id', {}, 'evt_', null],
    ['a non-string id', { id: 123 }, 'evt_', null],
  ])('handles %s', (_label, value, prefix, expected) => {
    expect(stripeId(value, prefix)).toBe(expected);
  });
});

describe('fulfillStripeEvent', () => {
  it('ignores unsupported events before reading billing state', async () => {
    const stripe = stripeWith();
    const db = { runTransaction: jest.fn() };

    await fulfillStripeEvent(stripe, db, 'test', event('charge.succeeded'));

    expect(mockBillingRefs).not.toHaveBeenCalled();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it.each([
    ['an invalid event id', { id: 'bad_id' }],
    ['an invalid customer id', { data: { object: { customer: 'customer_bad' } } }],
  ])('ignores %s', async (_label, override) => {
    const message = event();
    Object.assign(message, override);
    if (override.data) message.data = override.data;

    await fulfillStripeEvent(stripeWith(), { runTransaction: jest.fn() }, 'test', message);

    expect(mockBillingRefs).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing customer mapping', { mapping: null }],
    ['an event recorded before processing', { eventExists: true }],
  ])('stops for %s', async (_label, options) => {
    const { db } = setup(options);
    const stripe = stripeWith();

    await fulfillStripeEvent(stripe, db, 'test', event());

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it.each([
    ['an invalid checkout id', {}, { id: 'checkout_bad' }],
    ['an account owned by another customer', { account: { customerId: 'cus_other', revision: 2 } }, {}],
    ['a checkout owned by another user', { checkout: { uid: 'user-2', customerId: 'cus_valid' } }, {}],
    ['a checkout recorded for another customer', { checkout: { uid: 'user-1', customerId: 'cus_other' } }, {}],
    ['a mismatched client reference', {}, { client_reference_id: 'user-2' }],
    ['a non-subscription checkout', {}, { mode: 'payment' }],
    ['an incomplete payment', {}, { status: 'open', payment_status: 'unpaid' }],
  ])('rejects %s', async (_label, options, objectOverride) => {
    const { db } = setup(options);
    const stripe = stripeWith();

    await fulfillStripeEvent(stripe, db, 'test', event('checkout.session.completed', objectOverride));

    expect(db.runTransaction).not.toHaveBeenCalled();
    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
  });

  it('rechecks the account customer inside the transaction before writing', async () => {
    const { db, transaction } = setup({
      currentAccount: { customerId: 'cus_changed', revision: 2, fulfilledSubscriptions: [] },
    });

    await expect(fulfillStripeEvent(stripeWith(subscription()), db, 'test', event()))
      .rejects.toThrow('Billing state changed during webhook processing');

    expect(db.runTransaction).toHaveBeenCalledTimes(5);
    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.create).not.toHaveBeenCalled();
  });

  it('confirms a paid checkout and stores the active entitlement', async () => {
    const { db, transaction } = setup();
    const active = subscription({ lookupKey: 'paid_lookup' });
    const stripe = stripeWith(active, subscription({ id: 'sub_not_fulfilled' }));

    await fulfillStripeEvent(stripe, db, 'test', event());

    expect(stripe.subscriptions.list).toHaveBeenCalledWith({ customer: 'cus_valid', status: 'all' });
    expect(transaction.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'checkout' }), {
      status: 'confirmed', subscriptionId: 'sub_paid',
    });
    expect(transaction.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'account' }), {
      plan: 'photo-check',
      subscription: {
        id: 'sub_paid', plan: 'photo-check', status: 'active', currentPeriodEnd: 123,
        cancelAtPeriodEnd: false, priceId: 'price_paid',
      },
      activeSubscriptionIds: ['sub_paid'],
      fulfilledSubscriptions: ['sub_paid'],
      revision: 3,
    });
    expect(transaction.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'event' }), {
      type: 'checkout.session.completed', receivedAt: expect.any(Date),
    });
  });

  it('does not grant an active entitlement for an unrecognized price', async () => {
    const { db, transaction } = setup();
    const unknownPrice = subscription({ priceId: 'price_unknown', lookupKey: undefined });

    await fulfillStripeEvent(stripeWith(unknownPrice), db, 'test', event());

    expect(transaction.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'account' }), {
      plan: 'free',
      subscription: {
        id: 'sub_paid', plan: 'free', status: 'active', currentPeriodEnd: 123,
        cancelAtPeriodEnd: false, priceId: 'price_unknown',
      },
      activeSubscriptionIds: [],
      fulfilledSubscriptions: ['sub_paid'],
      revision: 3,
    });
  });

  it('records a failed checkout without querying Stripe or removing existing entitlement', async () => {
    const { db, transaction } = setup();
    const stripe = stripeWith();

    await fulfillStripeEvent(stripe, db, 'test', event('checkout.session.expired', {
      status: 'expired', payment_status: 'unpaid',
    }));

    expect(stripe.subscriptions.list).not.toHaveBeenCalled();
    expect(transaction.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ kind: 'checkout' }), {
      status: 'failed',
    });
    expect(transaction.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: 'account' }), {
      revision: 3,
    });
  });

  it('keeps the latest fulfilled subscription while downgrading when none are active paid plans', async () => {
    const { db, transaction } = setup({
      account: { customerId: 'cus_valid', revision: 7, fulfilledSubscriptions: ['sub_old'] },
    });
    const old = subscription({ id: 'sub_old', status: 'canceled', itemPeriodEnd: null,
      subscriptionPeriodEnd: 456 });

    await fulfillStripeEvent(stripeWith(old), db, 'test', event('invoice.payment_failed', {
      id: 'in_valid', subscription: undefined,
    }));

    expect(transaction.update).toHaveBeenCalledWith(expect.objectContaining({ kind: 'account' }), {
      plan: 'free',
      subscription: {
        id: 'sub_old', plan: 'photo-check', status: 'canceled', currentPeriodEnd: 456,
        cancelAtPeriodEnd: false, priceId: 'price_paid',
      },
      activeSubscriptionIds: [],
      fulfilledSubscriptions: ['sub_old'],
      revision: 8,
    });
  });

  it('does not write again when another transaction already recorded the event', async () => {
    const { db, transaction } = setup({ transactionEventExists: true });

    await fulfillStripeEvent(stripeWith(subscription()), db, 'test', event());

    expect(transaction.update).not.toHaveBeenCalled();
    expect(transaction.create).not.toHaveBeenCalled();
  });

  it('retries stale account revisions and fails after five attempts', async () => {
    const { db, transaction } = setup({
      currentAccount: { customerId: 'cus_valid', revision: 99 },
    });
    const stripe = stripeWith(subscription());

    await expect(fulfillStripeEvent(stripe, db, 'test', event())).rejects.toThrow(
      'Billing state changed during webhook processing');

    expect(db.runTransaction).toHaveBeenCalledTimes(5);
    expect(stripe.subscriptions.list).toHaveBeenCalledTimes(5);
    expect(transaction.update).not.toHaveBeenCalled();
  });
});
