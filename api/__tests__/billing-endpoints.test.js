/* eslint-env jest */
const { Readable } = require('node:stream');

jest.mock('stripe', () => jest.fn());
jest.mock('../../lib/stripeConfig.server.js', () => ({ secretKey: null, mode: 'test' }));
jest.mock('firebase-admin', () => ({
  apps: [{}],
  auth: jest.fn(),
  firestore: jest.fn(),
}));

const Stripe = require('stripe');
const stripeConfig = require('../../lib/stripeConfig.server.js');
const firebaseAdmin = require('firebase-admin');
const { webhooks } = jest.requireActual('stripe');
const portalHandler = require('../create-portal-session');

const createSession = jest.fn();
const retrieveCustomer = jest.fn();
const verifyIdToken = jest.fn();
const getUser = jest.fn();
const fixtureSigningSecret = 'fixture-signing-value';

let res;

function loadSubscriptionHandler() {
  // Firebase initialization runs when the module is first loaded.
  let handler;
  jest.isolateModules(() => {
    handler = require('../get-subscription-status');
  });
  return handler;
}

function loadWebhookHandler() {
  // The webhook validates config and constructs Stripe at import time.
  let handler;
  jest.isolateModules(() => {
    handler = require('../stripe-webhook');
  });
  return handler;
}

function webhookRequest(payload, signature) {
  return Object.assign(Readable.from([Buffer.from(payload)]), {
    method: 'POST',
    headers: signature === undefined ? {} : { 'stripe-signature': signature },
  });
}

function sign(payload) {
  return webhooks.generateTestHeaderString({ payload, secret: fixtureSigningSecret });
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  jest.replaceProperty(process, 'env', {
    ...process.env,
    FIREBASE_PROJECT_ID: 'fixture-project',
    FIREBASE_CLIENT_EMAIL: 'fixture@example.invalid',
    FIREBASE_PRIVATE_KEY: 'fixture-private-value',
    STRIPE_WEBHOOK_SECRET: fixtureSigningSecret,
  });
  stripeConfig.secretKey = 'sk_fixture_not_a_credential';

  firebaseAdmin.auth.mockReturnValue({ verifyIdToken });
  firebaseAdmin.firestore.mockReturnValue({
    collection: () => ({ doc: () => ({ get: getUser }) }),
  });

  Stripe.mockImplementation(() => ({
    billingPortal: { sessions: { create: createSession } },
    customers: { retrieve: retrieveCustomer },
    // Use the SDK's local signature verifier without creating a Stripe HTTP client.
    webhooks,
  }));

  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    setHeader: jest.fn(),
  };
});

afterEach(() => jest.restoreAllMocks());

const portalBody = { idToken: 'fixture-id-token' };

describe.each([
  {
    endpoint: 'create-portal-session',
    loadHandler: () => portalHandler,
    body: portalBody,
    missingKey: /Stripe is not configured properly/,
    invalidKey: /Stripe is not configured properly/,
    constructorError: 'Failed to create portal session',
  },
  {
    endpoint: 'get-subscription-status',
    loadHandler: loadSubscriptionHandler,
    body: { idToken: 'fixture-id-token' },
    missingKey: /Stripe secret key is not configured for test mode/,
    invalidKey: /Invalid secret key format/,
    constructorError: 'Failed to initialize Stripe configuration',
  },
])('$endpoint request and config failures', ({ loadHandler, body, missingKey, invalidKey, constructorError }) => {
  it('rejects GET and advertises POST before constructing Stripe', async () => {
    stripeConfig.secretKey = null;

    await loadHandler()({ method: 'GET' }, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
    expect(Stripe).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', null, 'missing'],
    ['invalid', 'bad_fixture', 'invalid'],
  ])('rejects %s Stripe config before constructing Stripe', async (_description, secretKey, kind) => {
    const error = kind === 'missing' ? missingKey : invalidKey;
    stripeConfig.secretKey = secretKey;

    verifyIdToken.mockResolvedValueOnce({ uid: 'fixture-user' });
    getUser.mockResolvedValueOnce({ exists: true, data: () => ({ stripeCustomerId: 'cus_fixture' }) });
    await loadHandler()({ method: 'POST', body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringMatching(error) });
    expect(Stripe).not.toHaveBeenCalled();
  });

  it('handles a Stripe constructor failure', async () => {
    Stripe.mockImplementationOnce(() => {
      throw new Error('Fixture initialization failure');
    });

    verifyIdToken.mockResolvedValueOnce({ uid: 'fixture-user' });
    getUser.mockResolvedValueOnce({ exists: true, data: () => ({ stripeCustomerId: 'cus_fixture' }) });
    await loadHandler()({ method: 'POST', body }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: constructorError });
  });
});

describe('create-portal-session', () => {
  it('rejects a missing ID token before creating a session', async () => {
    await portalHandler({ method: 'POST', body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid request' });
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each([
    ['StripeInvalidRequestError', 400, 'Invalid request to Stripe'],
    ['StripeConnectionError', 500, 'Failed to create portal session'],
  ])('maps %s to HTTP %i', async (type, status, error) => {
    const failure = new Error('Fixture portal failure');
    failure.type = type;
    createSession.mockRejectedValueOnce(failure);
    const returnUrl = 'https://safe-dose.vercel.app/settings';
    verifyIdToken.mockResolvedValueOnce({ uid: 'fixture-user' });
    getUser.mockResolvedValueOnce({ exists: true, data: () => ({ stripeCustomerId: 'cus_fixture' }) });

    await portalHandler({ method: 'POST', body: { ...portalBody, returnUrl } }, res);

    expect(createSession).toHaveBeenCalledWith({ customer: 'cus_fixture', return_url: returnUrl });
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error });
  });
});

describe('get-subscription-status', () => {
  const request = { method: 'POST', body: { idToken: 'fixture-id-token' } };

  it('rejects a missing ID token before authentication', async () => {
    await loadSubscriptionHandler()({ method: 'POST', body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'ID token is required' });
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('reports missing Firebase configuration', async () => {
    delete process.env.FIREBASE_PROJECT_ID;

    await loadSubscriptionHandler()(request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Firebase Admin not configured properly' });
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('rejects an invalid token before reading Firestore or Stripe', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('Fixture invalid token'));

    await loadSubscriptionHandler()(request, res);

    expect(verifyIdToken).toHaveBeenCalledWith(request.body.idToken);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authentication token' });
    expect(getUser).not.toHaveBeenCalled();
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it('returns a failure when the user lookup fails', async () => {
    const details = 'Fixture Firestore failure';
    verifyIdToken.mockResolvedValueOnce({ uid: 'fixture-user' });
    getUser.mockRejectedValueOnce(new Error(details));

    await loadSubscriptionHandler()(request, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Failed to get subscription status', details });
    expect(retrieveCustomer).not.toHaveBeenCalled();
  });

  it.each([
    ['StripeInvalidRequestError', 400, 'Invalid request to Stripe'],
    ['StripeConnectionError', 500, 'Failed to get subscription status'],
  ])('maps %s to HTTP %i after authentication', async (type, status, error) => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'fixture-user' });
    getUser.mockResolvedValueOnce({ exists: true, data: () => ({ stripeCustomerId: 'cus_fixture' }) });
    const failure = new Error('Fixture customer lookup failure');
    failure.type = type;
    retrieveCustomer.mockRejectedValueOnce(failure);

    await loadSubscriptionHandler()(request, res);

    expect(retrieveCustomer).toHaveBeenCalledWith('cus_fixture', { expand: ['subscriptions'] });
    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({ error, details: failure.message });
  });
});

describe('stripe-webhook', () => {
  const payload = JSON.stringify({
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_fixture', status: 'active' } },
  });

  it('fails at import time when the Stripe secret key is missing', () => {
    stripeConfig.secretKey = null;

    expect(loadWebhookHandler).toThrow(/Stripe secret key is not configured for test mode/);
    expect(Stripe).not.toHaveBeenCalled();
  });

  it('rejects a missing signature before handling the event', async () => {
    await loadWebhookHandler()(webhookRequest(payload), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/^Webhook Error:/));
    expect(res.json).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('rejects a body changed after signing before handling the event', async () => {
    await loadWebhookHandler()(webhookRequest(payload + '\n', sign(payload)), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/^Webhook Error:/));
    expect(res.json).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it('rejects a signed event when the signing secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    await loadWebhookHandler()(webhookRequest(payload, sign(payload)), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(expect.stringMatching(/^Webhook Error:/));
    expect(res.json).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it.each([
    ['checkout.session.completed', ['Received event:', 'checkout.session.completed', 'object_fixture']],
    ['customer.subscription.trial_will_end', ['Trial ending soon for subscription:', 'object_fixture']],
    ['customer.subscription.created', ['New subscription created:', 'object_fixture']],
    ['customer.subscription.updated', ['Subscription updated:', 'object_fixture']],
    ['customer.subscription.deleted', ['Subscription cancelled:', 'object_fixture']],
    ['fixture.unknown', ['Unhandled event type: fixture.unknown']],
  ])('logs and acknowledges a verified %s event', async (type, logArgs) => {
    const event = JSON.stringify({ type, data: { object: { id: 'object_fixture' } } });

    await loadWebhookHandler()(webhookRequest(event, sign(event)), res);

    expect(console.log).toHaveBeenCalledWith(...logArgs);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
