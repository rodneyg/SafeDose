/* eslint-env jest */
const { Buffer } = require('node:buffer');
const { Readable } = require('node:stream');

jest.mock('stripe', () => Object.assign(jest.fn(), {
  webhooks: jest.requireActual('stripe').webhooks,
}));
jest.mock('../../lib/stripeConfig.server', () => ({ secretKey: null, mode: 'test' }));
jest.mock('../../lib/firebaseAdmin.server', () => ({ getBillingFirebase: jest.fn() }));

const Stripe = require('stripe');
const stripeConfig = require('../../lib/stripeConfig.server');
const { getBillingFirebase } = require('../../lib/firebaseAdmin.server');
const portal = require('../create-portal-session');
const status = require('../get-subscription-status');
const validate = require('../validate-session');
const webhook = require('../stripe-webhook');

const signingSecret = 'whsec_billing_fixture';
const payload = JSON.stringify({
  id: 'evt_fixture',
  livemode: false,
  type: 'customer.subscription.updated',
  data: { object: { id: 'sub_fixture' } },
});
const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: signingSecret });
const endpoints = [
  ['portal', portal],
  ['subscription status', status],
  ['validation', validate],
];

let res;
beforeEach(() => {
  Stripe.mockReset();
  getBillingFirebase.mockReset();
  stripeConfig.secretKey = null;
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.replaceProperty(process, 'env', { ...process.env, STRIPE_WEBHOOK_SECRET: signingSecret });
  res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
});
afterEach(() => jest.restoreAllMocks());

describe.each([...endpoints, ['webhook', webhook]])('%s method handling', (_name, handler) => {
  it('rejects GET before initializing Stripe or Firebase', async () => {
    await handler({ method: 'GET' }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.status).toHaveBeenCalledWith(405);
    expect(Stripe).not.toHaveBeenCalled();
    expect(getBillingFirebase).not.toHaveBeenCalled();
  });
});

describe.each(endpoints)('%s rate limit', (_name, handler) => {
  it('returns a non-cacheable 429 after 30 requests from one client', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(100_000);
    const req = { method: 'POST', socket: { remoteAddress: '192.0.2.20' } };
    for (let i = 0; i < 30; i++) {
      await handler(req, res);
    }
    expect(res.status).toHaveBeenLastCalledWith(401);
    await handler(req, res);
    expect(res.status).toHaveBeenLastCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(Stripe).not.toHaveBeenCalled();
    expect(getBillingFirebase).not.toHaveBeenCalled();
  });
});

describe.each([['portal', portal], ['subscription status', status]])('%s failures', (_name, handler) => {
  const req = { method: 'POST', body: { idToken: 'fixture-token' } };
  const verifyIdToken = jest.fn();
  const get = jest.fn();

  beforeEach(() => {
    verifyIdToken.mockReset().mockResolvedValue({ uid: 'buyer', firebase: { sign_in_provider: 'google.com' } });
    get.mockReset().mockResolvedValue({ data: () => ({ customerId: 'cus_fixture' }) });
    const doc = () => ({ collection: () => ({ doc }), get });
    getBillingFirebase.mockReturnValue({ auth: { verifyIdToken }, db: { collection: () => ({ doc }) } });
  });

  it('returns a sanitized service error when billing storage is unavailable', async () => {
    get.mockRejectedValueOnce(new Error('Internal diagnostic'));
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
    expect(Stripe).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens before querying billing storage', async () => {
    verifyIdToken.mockRejectedValueOnce(Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' }));
    await handler(req, res);
    expect(verifyIdToken).toHaveBeenCalledWith(req.body.idToken, true);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(get).not.toHaveBeenCalled();
    expect(Stripe).not.toHaveBeenCalled();
  });
});

it.each([null, 'bad_fixture'])('rejects unusable portal Stripe configuration before construction (%s)', async key => {
  stripeConfig.secretKey = key;
  const verifyIdToken = async () => ({ uid: 'buyer', firebase: { sign_in_provider: 'google.com' } });
  const get = async () => ({ data: () => ({ customerId: 'cus_fixture' }) });
  const doc = () => ({ collection: () => ({ doc }), get });
  getBillingFirebase.mockReturnValue({ auth: { verifyIdToken }, db: { collection: () => ({ doc }) } });

  await portal({ method: 'POST', body: { idToken: 'fixture-token' } }, res);

  expect(res.status).toHaveBeenCalledWith(503);
  expect(Stripe).not.toHaveBeenCalled();
});

function webhookRequest(body, stripeSignature) {
  return Object.assign(Readable.from([Buffer.from(body)]), {
    method: 'POST',
    headers: stripeSignature ? { 'stripe-signature': stripeSignature } : {},
  });
}

describe('stripe-webhook', () => {
  it.each([
    ['missing signature', payload, undefined],
    ['body changed after signing', payload + '\n', signature],
  ])('rejects a %s before initializing Stripe or Firebase', async (_name, body, stripeSignature) => {
    await webhook(webhookRequest(body, stripeSignature), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Stripe signature.' });
    expect(Stripe).not.toHaveBeenCalled();
    expect(getBillingFirebase).not.toHaveBeenCalled();
  });

  it('returns a retryable response when the webhook signing secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    await webhook(webhookRequest(payload, signature), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(Stripe).not.toHaveBeenCalled();
    expect(getBillingFirebase).not.toHaveBeenCalled();
  });

  it('returns a retryable response when the Stripe key is missing', async () => {
    await webhook(webhookRequest(payload, signature), res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(Stripe).not.toHaveBeenCalled();
    expect(getBillingFirebase).not.toHaveBeenCalled();
  });
});
