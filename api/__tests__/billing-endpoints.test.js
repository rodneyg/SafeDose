/* eslint-env jest */
const { Readable } = require('stream');

jest.mock('stripe', () => jest.fn());
jest.mock('../../lib/stripeConfig.server.js', () => ({ mode: 'test' }));
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: { cert: jest.fn() },
  auth: jest.fn(),
  firestore: jest.fn(),
}));

const firebaseEnv = {
  FIREBASE_PROJECT_ID: 'fixture-project',
  FIREBASE_CLIENT_EMAIL: 'fixture@example.invalid',
  FIREBASE_PRIVATE_KEY: 'fixture-placeholder',
};
const firebaseEnvKeys = Object.keys(firebaseEnv);
const mockSigningSecret = 'local-signature-fixture';
const mockToken = 'fixture-token';
const customerId = 'cus_fixture';

let originalEnv;
let res;
let Stripe;
let stripeConfig;
let createPortalSession;
let retrieveCustomer;
let constructEvent;
let verifyIdToken;
let collection;
let doc;
let getUser;

beforeEach(() => {
  // Reload handlers that read configuration or initialize clients on import.
  jest.resetModules();
  originalEnv = process.env;
  process.env = { ...originalEnv, ...firebaseEnv, STRIPE_WEBHOOK_SECRET: mockSigningSecret };

  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  createPortalSession = jest.fn();
  retrieveCustomer = jest.fn();
  constructEvent = jest.fn();
  verifyIdToken = jest.fn().mockResolvedValue({ uid: 'fixture-user' });
  getUser = jest.fn().mockResolvedValue({
    exists: true,
    data: () => ({ stripeCustomerId: customerId }),
  });
  doc = jest.fn(() => ({ get: getUser }));
  collection = jest.fn(() => ({ doc }));

  res = {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    json: jest.fn(),
    send: jest.fn(),
  };
  Stripe = require('stripe');
  stripeConfig = require('../../lib/stripeConfig.server.js');
  stripeConfig.secretKey = 'sk_fixture_not_a_key';
  Stripe.mockImplementation(() => ({
    billingPortal: { sessions: { create: createPortalSession } },
    customers: { retrieve: retrieveCustomer },
    webhooks: { constructEvent },
  }));

  const admin = require('firebase-admin');
  admin.auth.mockReturnValue({ verifyIdToken });
  admin.firestore.mockReturnValue({ collection });
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

const getPortalHandler = () => require('../create-portal-session');
const getSubscriptionHandler = () => require('../get-subscription-status');
const getWebhookHandler = () => require('../stripe-webhook');

async function post(handler, body) {
  await handler({ method: 'POST', headers: {}, body }, res);
}

function expectJson(status, body) {
  expect(res.status).toHaveBeenCalledTimes(1);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith(body);
}

describe.each([
  ['create-portal-session', getPortalHandler, () => createPortalSession],
  ['get-subscription-status', getSubscriptionHandler, () => retrieveCustomer],
])('%s', (_name, getHandler, getStripeOperation) => {
  it('rejects non-POST methods with an Allow header', async () => {
    await getHandler()({ method: 'GET' }, res);

    expectJson(405, { error: 'Method Not Allowed' });
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(getStripeOperation()).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects missing Stripe configuration', async () => {
    delete stripeConfig.secretKey;

    await post(getHandler(), { customerId, idToken: mockToken });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Stripe secret key is not configured for test mode'),
    });
    expect(getStripeOperation()).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('rejects an invalid Stripe key format', async () => {
    stripeConfig.secretKey = 'invalid-fixture';

    await post(getHandler(), { customerId, idToken: mockToken });

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: expect.stringContaining('Invalid secret key format'),
    });
    expect(getStripeOperation()).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('returns a generic error when Stripe initialization fails', async () => {
    Stripe.mockImplementation(() => {
      throw new Error('Synthetic constructor error');
    });

    await post(getHandler(), { customerId, idToken: mockToken });

    expectJson(500, { error: 'Failed to initialize Stripe configuration' });
    expect(getStripeOperation()).not.toHaveBeenCalled();
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});

describe('create-portal-session request failures', () => {
  it('requires a customer ID before creating a portal session', async () => {
    await post(getPortalHandler(), {});

    expectJson(400, { error: 'Customer ID is required' });
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it.each([
    ['StripeInvalidRequestError', 400, 'Invalid request to Stripe'],
    ['StripeConnectionError', 500, 'Failed to create portal session'],
  ])('maps a Stripe %s to HTTP %i', async (type, status, message) => {
    const details = 'Synthetic portal failure';
    createPortalSession.mockRejectedValue(Object.assign(new Error(details), { type }));
    const returnUrl = 'https://example.invalid/settings';

    await post(getPortalHandler(), { customerId, returnUrl });

    expect(createPortalSession).toHaveBeenCalledWith({ customer: customerId, return_url: returnUrl });
    expectJson(status, { error: message, details });
  });
});

describe('get-subscription-status request failures', () => {
  it('requires an ID token before looking up a user', async () => {
    await post(getSubscriptionHandler(), {});

    expectJson(400, { error: 'ID token is required' });
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('returns a configuration error when Firebase credentials are absent', async () => {
    for (const key of firebaseEnvKeys) delete process.env[key];

    await post(getSubscriptionHandler(), { idToken: mockToken });

    expectJson(500, { error: 'Firebase Admin not configured properly' });
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('returns 401 when Firebase rejects the ID token', async () => {
    verifyIdToken.mockRejectedValue(new Error('Synthetic token verification failure'));

    await post(getSubscriptionHandler(), { idToken: mockToken });

    expectJson(401, { error: 'Invalid authentication token' });
    expect(verifyIdToken).toHaveBeenCalledWith(mockToken);
    expect(getUser).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('returns a failure when the user lookup fails', async () => {
    const details = 'Synthetic Firestore failure';
    getUser.mockRejectedValue(new Error(details));

    await post(getSubscriptionHandler(), { idToken: mockToken });

    expect(doc).toHaveBeenCalledWith('fixture-user');
    expectJson(500, { error: 'Failed to get subscription status', details });
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it.each([
    ['StripeInvalidRequestError', 400, 'Invalid request to Stripe'],
    ['StripeConnectionError', 500, 'Failed to get subscription status'],
  ])('maps a Stripe %s to HTTP %i', async (type, status, message) => {
    const details = 'Synthetic customer lookup failure';
    retrieveCustomer.mockRejectedValue(Object.assign(new Error(details), { type }));

    await post(getSubscriptionHandler(), { idToken: mockToken });

    expect(retrieveCustomer).toHaveBeenCalledWith(customerId, { expand: ['subscriptions'] });
    expectJson(status, { error: message, details });
  });
});

describe('stripe-webhook', () => {
  const payload = Buffer.from('{ "id": "evt_fixture" }\n');

  function request(signature) {
    const req = Readable.from([payload]);
    req.method = 'POST';
    req.headers = signature === undefined ? {} : { 'stripe-signature': signature };
    return req;
  }

  it('fails to load when the Stripe key is missing', () => {
    delete stripeConfig.secretKey;

    expect(() => getWebhookHandler()).toThrow(
      'Stripe secret key is not configured for test mode'
    );
  });

  it.each([
    ['missing signature header', undefined, mockSigningSecret],
    ['invalid signature header', 'invalid-signature', mockSigningSecret],
    ['missing signing secret', 'fixture-signature', undefined],
  ])('returns 400 when Stripe rejects a request with %s', async (_label, signature, secret) => {
    if (secret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    constructEvent.mockImplementation(() => {
      throw new Error('Synthetic signature verification failure');
    });
    const handler = getWebhookHandler();

    await handler(request(signature), res);

    expect(constructEvent).toHaveBeenCalledWith(payload, signature, secret);
    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error: Synthetic signature verification failure');
    expect(res.json).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  // The handler currently logs checkout and subscription events and acknowledges them.
  // Subscription writes, reminders, and analytics are TODOs.
  it.each([
    ['checkout.session.completed', ['Received event:', 'checkout.session.completed', 'object_fixture']],
    ['customer.subscription.trial_will_end', ['Trial ending soon for subscription:', 'object_fixture']],
    ['customer.subscription.created', ['New subscription created:', 'object_fixture']],
    ['customer.subscription.updated', ['Subscription updated:', 'object_fixture']],
    ['customer.subscription.deleted', ['Subscription cancelled:', 'object_fixture']],
  ])('logs and acknowledges a verified %s event', async (type, logArgs) => {
    constructEvent.mockReturnValue({ type, data: { object: { id: 'object_fixture' } } });
    const handler = getWebhookHandler();

    await handler(request('fixture-signature'), res);

    expect(constructEvent).toHaveBeenCalledWith(payload, 'fixture-signature', mockSigningSecret);
    expect(console.log).toHaveBeenCalledWith(...logArgs);
    expectJson(200, { received: true });
  });

  it('acknowledges a verified event it does not handle', async () => {
    constructEvent.mockReturnValue({ type: 'fixture.unknown' });
    const handler = getWebhookHandler();

    await handler(request('fixture-signature'), res);

    expect(console.log).toHaveBeenCalledWith('Unhandled event type: fixture.unknown');
    expectJson(200, { received: true });
  });
});
