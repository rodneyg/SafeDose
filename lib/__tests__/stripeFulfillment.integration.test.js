/* eslint-env jest */
const { Buffer } = require('node:buffer');
const { Readable } = require('node:stream');

const mockStripe = {
  customers: { create: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: { list: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
};
const mockFirebase = jest.fn();
jest.mock('stripe', () => Object.assign(jest.fn(() => mockStripe), {
  webhooks: jest.requireActual('stripe').webhooks,
}));
jest.mock('../stripeConfig.server', () => ({ secretKey: 'sk_test_fixture', mode: 'test' }));
jest.mock('../firebaseAdmin.server', () => ({ getBillingFirebase: () => mockFirebase() }));

const Stripe = require('stripe');
const { billingRefs } = require('../billing.server');
const { getLimitForPlan, hasScanCapacity } = require('../plans');
const checkout = require('../../api/create-checkout-session');
const webhook = require('../../api/stripe-webhook');
const status = require('../../api/get-subscription-status');
const validate = require('../../api/validate-session');
const portal = require('../../api/create-portal-session');

const secret = 'whsec_fulfillment_fixture';
const origin = 'https://safedose.rodneygainous.com';
const price = { id: 'price_monthly_fixture', lookup_key: 'safedose_photo_check_monthly' };
const checkoutRequest = {
  offerKey: 'photo_check_monthly',
  successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancelUrl: `${origin}/pricing`,
};
const session = {
  id: 'cs_buyer',
  customer: 'cus_buyer',
  subscription: 'sub_buyer',
  status: 'complete',
  payment_status: 'paid',
  mode: 'subscription',
  client_reference_id: 'buyer',
};
let db;
let refs;
let nextId;

function fakeFirestore() {
  const records = new Map();
  let transactions = Promise.resolve();
  function snapshot(path) {
    const data = records.get(path);
    return { exists: data !== undefined, data: () => data };
  }
  function document(path) {
    return {
      path,
      get: async () => snapshot(path),
      collection: name => collection(`${path}/${name}`),
      create: async data => {
        if (records.has(path)) throw new Error('Document already exists');
        records.set(path, data);
      },
    };
  }
  function collection(path) {
    return { doc: id => document(`${path}/${id}`) };
  }
  return {
    collection,
    getAll: async (...refs) => refs.map(ref => snapshot(ref.path)),
    runTransaction(callback) {
      const next = transactions.then(async () => {
        const writes = new Map();
        const result = await callback({
          get: ref => ref.get(),
          create: (ref, data) => {
            if (records.has(ref.path)) throw new Error('Document already exists');
            writes.set(ref.path, data);
          },
          set: (ref, data, { merge } = {}) => writes.set(ref.path, merge ? { ...records.get(ref.path), ...data } : data),
          update: (ref, data) => {
            if (!records.has(ref.path)) throw new Error('Document does not exist');
            writes.set(ref.path, { ...records.get(ref.path), ...data });
          },
        });
        for (const [path, data] of writes) records.set(path, data);
        return result;
      });
      transactions = next.catch(() => {});
      return next;
    },
  };
}

async function invoke(handler, req) {
  const res = {
    code: null,
    body: null,
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler(req, res);
  return { code: res.code, body: res.body };
}

function request(handler, body = {}, token = 'buyer') {
  return invoke(handler, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body });
}

function event(type, object = session, overrides = {}) {
  return { id: `evt_${++nextId}`, type, livemode: false, data: { object }, ...overrides };
}

function sendEvent(message, { valid = true } = {}) {
  // Preserve whitespace and deliver the body in chunks as a raw HTTP stream.
  const payload = JSON.stringify(message, null, 2);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
  const req = Readable.from([Buffer.from(payload.slice(0, 10)), Buffer.from(payload.slice(10))]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': valid ? signature : signature + 'bad' };
  return invoke(webhook, req);
}

function setSubscriptions(...subscriptions) {
  mockStripe.subscriptions.list.mockImplementation(async function* () {
    yield* subscriptions;
  });
}

function subscription(status, id = 'sub_buyer', planPrice = price, cancelAtPeriodEnd = false) {
  return {
    id, status, cancel_at_period_end: cancelAtPeriodEnd,
    items: { data: [{ price: planPrice, current_period_end: 1893456000 }] },
  };
}

async function expectScanAccess(expected, token = 'buyer') {
  const result = await request(status, {}, token);
  expect(result.code).toBe(200);
  expect(result.body.hasActiveSubscription).toBe(expected);
  expect(hasScanCapacity(3, getLimitForPlan(result.body.plan, false))).toBe(expected);
}

const originalEnv = {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID: process.env.STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID,
};
beforeEach(() => {
  jest.resetAllMocks();
  Stripe.mockImplementation(() => mockStripe);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  nextId = 0;
  db = fakeFirestore();
  refs = billingRefs(db);
  process.env.STRIPE_WEBHOOK_SECRET = secret;
  process.env.STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID = price.id;
  mockStripe.customers.create.mockResolvedValue({ id: 'cus_buyer' });
  mockStripe.checkout.sessions.create.mockResolvedValue({ id: session.id });
  mockFirebase.mockReturnValue({
    db,
    auth: { verifyIdToken: async token => {
      if (token === 'expired') throw Object.assign(new Error('Expired token'), { code: 'auth/id-token-expired' });
      return { uid: token, firebase: { sign_in_provider: token === 'guest' ? 'anonymous' : 'google.com' } };
    } },
  });
  setSubscriptions(subscription('active'));
});
afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.restoreAllMocks();
});

it.each([null, 'guest', 'expired'])('rejects missing or ineligible auth (%s) before contacting Stripe', async token => {
  expect((await request(checkout, checkoutRequest, token)).code).toBe(401);
  expect(mockStripe.customers.create).not.toHaveBeenCalled();
  expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
});

it('persists and reuses a customer mapping, including concurrent checkout requests', async () => {
  mockStripe.checkout.sessions.create
    .mockResolvedValueOnce({ id: 'cs_first' })
    .mockResolvedValueOnce({ id: 'cs_second' })
    .mockResolvedValueOnce({ id: 'cs_third' });
  const results = await Promise.all([request(checkout, checkoutRequest), request(checkout, checkoutRequest)]);
  expect(results.map(result => result.code)).toEqual([200, 200]);
  const first = mockStripe.customers.create.mock.calls[0];
  expect(first[0]).toEqual({ metadata: { safeDoseUid: 'buyer' } });
  expect(mockStripe.customers.create.mock.calls[1]).toEqual(first);
  expect((await refs.customer('cus_buyer').get()).data()).toEqual({ uid: 'buyer' });
  expect((await refs.account('buyer').get()).data()).toEqual({ customerId: 'cus_buyer' });
  expect((await request(checkout, checkoutRequest)).code).toBe(200);
  expect(mockStripe.customers.create).toHaveBeenCalledTimes(2);
  for (const [config] of mockStripe.checkout.sessions.create.mock.calls) {
    expect(config).toMatchObject({ customer: 'cus_buyer', client_reference_id: 'buyer' });
  }
});

it('grants scan access only after a valid paid webhook for the right account', async () => {
  await db.collection('users').doc('buyer').create({ plan: 'plus', scansUsed: 3 });
  expect((await request(checkout, checkoutRequest)).code).toBe(200);
  await expectScanAccess(false);
  expect(await request(validate, { session_id: session.id })).toEqual({ code: 200, body: { status: 'pending', isValid: false } });
  expect((await request(validate, { session_id: session.id }, 'other')).code).toBe(404);
  expect((await sendEvent(event('customer.subscription.created', { customer: session.customer }))).code).toBe(200);
  expect((await sendEvent(event('checkout.session.completed'), { valid: false })).code).toBe(400);
  expect((await sendEvent(event('checkout.session.completed', session, { livemode: true }))).code).toBe(400);
  expect((await sendEvent(event('checkout.session.completed', { ...session, client_reference_id: 'other' }))).code).toBe(200);
  await expectScanAccess(false);
  expect((await sendEvent(event('checkout.session.completed'))).code).toBe(200);
  await expectScanAccess(true);
  await expectScanAccess(false, 'other');
  expect(await request(validate, { session_id: session.id })).toEqual({ code: 200, body: { status: 'active', isValid: true } });
  expect((await db.collection('users').doc('buyer').get()).data()).toEqual({ plan: 'plus', scansUsed: 3 });
});

it('keeps unpaid Photo Check pending, handles a failed payment, then honors delayed confirmation and duplicate deliveries', async () => {
  await request(checkout, checkoutRequest);
  await sendEvent(event('checkout.session.completed', { ...session, payment_status: 'unpaid' }));
  expect((await request(validate, { session_id: session.id })).body.status).toBe('pending');
  await expectScanAccess(false);
  const failed = event('checkout.session.async_payment_failed', { ...session, payment_status: 'unpaid' });
  await sendEvent(failed);
  expect((await request(validate, { session_id: session.id })).body.status).toBe('failed');
  const paid = event('checkout.session.async_payment_succeeded');
  const requests = await Promise.all([sendEvent(paid), sendEvent(paid)]);
  expect(requests.map(result => result.code)).toEqual([200, 200]);
  expect((await refs.account('buyer').get()).data().revision).toBe(2);
  expect((await refs.event(paid.id).get()).exists).toBe(true);
  await sendEvent(event('checkout.session.async_payment_failed', { ...session, payment_status: 'unpaid' }));
  await expectScanAccess(true);
  expect((await request(validate, { session_id: session.id })).body.status).toBe('active');
});

it('honors no-payment-required only for an allowed legacy trial', async () => {
  await request(checkout, checkoutRequest);
  await sendEvent(event('checkout.session.completed', { ...session, payment_status: 'no_payment_required' }));
  await expectScanAccess(false);

  const priceId = 'price_1RUHgxAY2p4W374Yb5EWEtZ0';
  const legacy = { id: 'cs_trial', subscription: 'sub_trial' };
  mockStripe.checkout.sessions.create.mockResolvedValueOnce({ id: legacy.id });
  await request(checkout, { ...checkoutRequest, offerKey: undefined, priceId, hasTrial: true });
  setSubscriptions(subscription('trialing', legacy.subscription, { id: priceId }));
  await sendEvent(event('checkout.session.completed', { ...session, ...legacy, payment_status: 'no_payment_required' }));
  expect((await request(status)).body.plan).toBe('full-pro');
  await expectScanAccess(true);
});

it('uses current Stripe state for payment failure, renewal and out-of-order cancellation events', async () => {
  await request(checkout, checkoutRequest);
  await sendEvent(event('checkout.session.completed'));
  await expectScanAccess(true);

  setSubscriptions(subscription('active', 'sub_buyer', price, true));
  await sendEvent(event('customer.subscription.updated', { customer: session.customer }));
  await expectScanAccess(true);
  expect((await request(status)).body.subscription.cancelAtPeriodEnd).toBe(true);

  setSubscriptions(subscription('past_due'));
  await sendEvent(event('invoice.payment_failed', { customer: session.customer }));
  await expectScanAccess(false);

  setSubscriptions(subscription('active'));
  await sendEvent(event('invoice.paid', { customer: session.customer }));
  await expectScanAccess(true);

  setSubscriptions(subscription('canceled'));
  await sendEvent(event('customer.subscription.deleted', { customer: session.customer }));
  await sendEvent(event('customer.subscription.updated', { customer: session.customer, status: 'active' }));
  await expectScanAccess(false);
  expect((await request(validate, { session_id: session.id })).body.status).toBe('inactive');
});

it('keeps access while another verified recognized subscription is still active', async () => {
  await request(checkout, checkoutRequest);
  await sendEvent(event('checkout.session.completed'));
  mockStripe.checkout.sessions.create.mockResolvedValueOnce({ id: 'cs_second' });
  await request(checkout, checkoutRequest);
  setSubscriptions(subscription('active', 'sub_second'), subscription('active'));
  await sendEvent(event('checkout.session.completed', { ...session, id: 'cs_second', subscription: 'sub_second' }));

  setSubscriptions(subscription('canceled', 'sub_second'), subscription('active'), subscription('active', 'sub_other'));
  await sendEvent(event('customer.subscription.deleted', { customer: session.customer }));
  await expectScanAccess(true);

  setSubscriptions(subscription('canceled', 'sub_second'), subscription('active', 'sub_other'),
    subscription('active', 'sub_buyer', { id: 'price_other' }));
  await sendEvent(event('customer.subscription.updated', { customer: session.customer }));
  await expectScanAccess(false);
});

it('re-fetches Stripe if a concurrent commit would otherwise publish stale entitlement', async () => {
  await request(checkout, checkoutRequest);
  await sendEvent(event('checkout.session.completed'));

  let releaseStaleRead;
  let staleReadStarted;
  const pause = new Promise(resolve => { releaseStaleRead = resolve; });
  const started = new Promise(resolve => { staleReadStarted = resolve; });
  mockStripe.subscriptions.list.mockImplementationOnce(async function* () {
    staleReadStarted();
    await pause;
    yield subscription('active');
  });
  setSubscriptions(subscription('canceled'));
  const staleEvent = sendEvent(event('customer.subscription.updated', { customer: session.customer }));
  await started;
  await sendEvent(event('customer.subscription.deleted', { customer: session.customer }));
  releaseStaleRead();
  expect((await staleEvent).code).toBe(200);
  await expectScanAccess(false);
});

it('allows a retry after a failed Stripe reconciliation without issuing access early', async () => {
  await request(checkout, checkoutRequest);
  const paid = event('checkout.session.completed');
  mockStripe.subscriptions.list.mockImplementationOnce(() => { throw new Error('Stripe unavailable'); });
  expect((await sendEvent(paid)).code).toBe(503);
  expect((await refs.event(paid.id).get()).exists).toBe(false);
  await expectScanAccess(false);
  expect((await sendEvent(paid)).code).toBe(200);
  await expectScanAccess(true);
});

it('creates a customer portal only for the verified account', async () => {
  await request(checkout, checkoutRequest);
  mockStripe.billingPortal.sessions.create.mockResolvedValue({ id: 'bps_buyer', url: 'https://billing.stripe.example/session' });
  const portalRequest = { customerId: 'cus_other', returnUrl: `${origin}/settings` };
  expect((await request(portal, portalRequest, 'other')).code).toBe(404);
  expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  expect((await request(portal, portalRequest)).code).toBe(200);
  expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({ customer: 'cus_buyer', return_url: `${origin}/settings` });
});
