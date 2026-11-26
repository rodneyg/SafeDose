/* eslint-env jest */
// Failure-path tests for the billing endpoints. Everything external is mocked:
// no live Stripe calls, no real Firebase, and only fake fixture keys.
// The webhook handler no longer persists subscription changes itself. It verifies the
// signature and mode, then hands every event to fulfillStripeEvent. These tests describe that.

const mockCreatePortal = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockConstructEvent = jest.fn();
const mockBuffer = jest.fn();
const mockStripeConfig = { secretKey: 'sk_test_fixture', mode: 'test' };

jest.mock('stripe', () => Object.assign(
  jest.fn(() => ({ billingPortal: { sessions: { create: mockCreatePortal } } })),
  { webhooks: { constructEvent: mockConstructEvent } },
));
jest.mock('micro', () => ({ buffer: mockBuffer }));
jest.mock('../../lib/stripeConfig.server', () => mockStripeConfig);
jest.mock('../../lib/stripeFulfillment.server', () => ({ fulfillStripeEvent: jest.fn() }));
jest.mock('../../lib/firebaseAdmin.server', () => ({
  getBillingFirebase: () => ({
    auth: { verifyIdToken: mockVerifyIdToken },
    db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ get: mockGet }) }) }) }) },
  }),
}));

const Stripe = require('stripe');
const { fulfillStripeEvent } = require('../../lib/stripeFulfillment.server');
const portal = require('../create-portal-session');
const status = require('../get-subscription-status');
const webhook = require('../stripe-webhook');

let res;
beforeEach(() => {
  jest.clearAllMocks();
  mockStripeConfig.secretKey = 'sk_test_fixture';
  mockStripeConfig.mode = 'test';
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.replaceProperty(process, 'env', { ...process.env, STRIPE_WEBHOOK_SECRET: 'whsec_fixture' });
  mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', firebase: { sign_in_provider: 'google.com' } });
  mockGet.mockResolvedValue({ data: () => ({ customerId: 'cus_fixture', plan: 'photo_check' }) });
  mockCreatePortal.mockResolvedValue({ id: 'bps_fixture', url: 'https://billing.stripe.com/fixture' });
  res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn() };
});
afterEach(() => jest.restoreAllMocks());

const post = (extra = {}) => ({ method: 'POST', headers: {}, socket: { remoteAddress: '198.51.100.7' }, ...extra });

describe.each([['portal', portal], ['subscription status', status]])('%s auth', (_name, handler) => {
  it.each([
    ['no token anywhere', post()],
    ['empty body token', post({ body: { idToken: '' } })],
    ['malformed Authorization header', post({ headers: { authorization: 'Basic abc' } })],
  ])('returns 401 for %s without touching Firebase or Stripe', async (_label, req) => {
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Sign in to your SafeDose account.' });
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(Stripe).not.toHaveBeenCalled();
  });

  it.each([
    ['anonymous sign-in', { uid: 'u', firebase: { sign_in_provider: 'anonymous' } }],
    ['no provider', { uid: 'u', firebase: {} }],
    ['no uid', { firebase: { sign_in_provider: 'google.com' } }],
  ])('returns 401 for a verified token with %s', async (_label, claims) => {
    mockVerifyIdToken.mockResolvedValueOnce(claims);
    await handler(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it.each(['auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled'])(
    'returns 401 for Firebase error %s', async code => {
      mockVerifyIdToken.mockRejectedValueOnce(Object.assign(new Error('fixture'), { code }));
      await handler(post({ body: { idToken: 'fixture-token' } }), res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

  it('returns a sanitized 503 for an unexpected Firebase error', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(Object.assign(new Error('secret internal detail'), { code: 'app/network-error' }));
    await handler(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret internal detail');
  });

  it('accepts a Bearer token and verifies it with revocation checks', async () => {
    await handler(post({ headers: { authorization: 'Bearer header-token' } }), res);
    expect(mockVerifyIdToken).toHaveBeenCalledWith('header-token', true);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('get-subscription-status', () => {
  it('rejects PUT with an Allow header', async () => {
    await status({ method: 'PUT' }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('reports the free defaults when the account document is empty', async () => {
    mockGet.mockResolvedValueOnce({ data: () => undefined });
    await status(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      hasActiveSubscription: false, subscriptionStatus: 'none', plan: 'free', customerId: null, subscription: null,
    });
  });

  it('reports a paid plan from stored account data without calling Stripe', async () => {
    mockGet.mockResolvedValueOnce({ data: () => ({ plan: 'photo_check', customerId: 'cus_fixture', subscription: { status: 'active' } }) });
    await status(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      hasActiveSubscription: true, subscriptionStatus: 'active', plan: 'photo_check', customerId: 'cus_fixture',
    }));
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(Stripe).not.toHaveBeenCalled();
  });

  it('returns a sanitized 503 when storage fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('firestore down'));
    await status(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('firestore down');
  });
});

describe('create-portal-session', () => {
  it('rejects PATCH with an Allow header before reading the body', async () => {
    await portal({ method: 'PATCH', body: null }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it.each([
    ['a live-mode key while in test mode', 'sk_live_fixture'],
    ['a missing key', undefined],
    ['an empty key', ''],
  ])('returns 503 for %s and never builds a Stripe client', async (_label, key) => {
    mockStripeConfig.secretKey = key;
    await portal(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
    expect(Stripe).not.toHaveBeenCalled();
    expect(mockCreatePortal).not.toHaveBeenCalled();
  });

  it('returns 404 when the account document does not exist', async () => {
    mockGet.mockResolvedValueOnce({ data: () => undefined });
    await portal(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'No subscription to manage.' });
    expect(mockCreatePortal).not.toHaveBeenCalled();
  });

  it('rejects a non-string return URL before authenticating', async () => {
    await portal(post({ body: { idToken: 'fixture-token', returnUrl: 42 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('hides the message of a non-validation Stripe failure', async () => {
    mockCreatePortal.mockRejectedValueOnce(Object.assign(new Error('card_declined internal'), { type: 'StripeAPIError' }));
    await portal(post({ body: { idToken: 'fixture-token' } }), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('card_declined');
  });

  it('uses the default settings return URL when none is sent', async () => {
    await portal(post({ body: { idToken: 'fixture-token' } }), res);
    expect(mockCreatePortal).toHaveBeenCalledWith({
      customer: 'cus_fixture',
      return_url: expect.stringMatching(/^https:\/\/.+\/settings$/),
    });
  });
});

describe('stripe-webhook', () => {
  const event = { id: 'evt_fixture', type: 'customer.subscription.updated', livemode: false, data: { object: { id: 'sub_fixture' } } };
  const webhookReq = (headers = { 'stripe-signature': 'sig_fixture' }) => ({ method: 'POST', headers });

  beforeEach(() => {
    mockBuffer.mockResolvedValue(Buffer.from('{}'));
    mockConstructEvent.mockReturnValue(event);
  });

  it.each(['PUT', 'DELETE', 'GET'])('rejects %s with an Allow header', async method => {
    await webhook({ method, headers: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(mockBuffer).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', {}],
    ['an array', { 'stripe-signature': ['a', 'b'] }],
  ])('returns 400 when the signature header is %s', async (_label, headers) => {
    await webhook(webhookReq(headers), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Stripe signature.' });
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'not_a_webhook_secret', 'sk_test_fixture'])(
    'returns a retryable 503 for webhook secret %p', async secret => {
      jest.replaceProperty(process, 'env', { ...process.env, STRIPE_WEBHOOK_SECRET: secret });
      await webhook(webhookReq(), res);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(mockConstructEvent).not.toHaveBeenCalled();
      expect(fulfillStripeEvent).not.toHaveBeenCalled();
    });

  it('returns 400 when the request body cannot be read', async () => {
    mockBuffer.mockRejectedValueOnce(new Error('stream aborted'));
    await webhook(webhookReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Stripe signature.' });
    expect(fulfillStripeEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['a live event in test mode', 'test', true],
    ['a test event in live mode', 'live', false],
  ])('returns 400 for %s and skips fulfillment', async (_label, mode, livemode) => {
    mockStripeConfig.mode = mode;
    mockConstructEvent.mockReturnValue({ ...event, livemode });
    await webhook(webhookReq(), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Webhook mode mismatch.' });
    expect(fulfillStripeEvent).not.toHaveBeenCalled();
  });

  it('passes a subscription update straight to fulfillment and writes nothing itself', async () => {
    await webhook(webhookReq(), res);
    expect(fulfillStripeEvent).toHaveBeenCalledTimes(1);
    expect(fulfillStripeEvent).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'test', event);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('logs only the event id and type when fulfillment fails, not the error', async () => {
    fulfillStripeEvent.mockRejectedValueOnce(new Error('sensitive firestore detail'));
    await webhook(webhookReq(), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(console.error).toHaveBeenCalledWith('[billing] webhook processing failed', 'evt_fixture', 'customer.subscription.updated');
    expect(JSON.stringify(console.error.mock.calls)).not.toContain('sensitive');
  });

  it('returns 503 when the Stripe key is unusable, before any Stripe client exists', async () => {
    mockStripeConfig.secretKey = 'bad_fixture';
    fulfillStripeEvent.mockImplementationOnce(async stripeClient => stripeClient);
    await webhook(webhookReq(), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(Stripe).not.toHaveBeenCalled();
    expect(fulfillStripeEvent).not.toHaveBeenCalled();
  });
});
