/* eslint-env jest */

const mockConstructEvent = jest.fn();
const mockBuffer = jest.fn();

jest.mock('stripe', () => Object.assign(jest.fn(() => ({})), {
  webhooks: { constructEvent: mockConstructEvent },
}));
jest.mock('../../lib/firebaseAdmin.server', () => ({ getBillingFirebase: jest.fn(() => ({ db: {} })) }));
jest.mock('../../lib/stripeFulfillment.server', () => ({ fulfillStripeEvent: jest.fn() }));
jest.mock('micro', () => ({ buffer: mockBuffer }));
jest.mock('../../lib/stripeConfig.server.js', () => ({
  secretKey: 'sk_test_fixture',
  mode: 'test',
}));

const { fulfillStripeEvent } = require('../../lib/stripeFulfillment.server');
const handler = require('../stripe-webhook');

const requestBody = Buffer.from('{"mock":"payload"}');
const secret = 'whsec_webhook_fixture';
const request = { method: 'POST', headers: { 'stripe-signature': 'fixture_signature' } };
let res;

beforeEach(() => {
  jest.clearAllMocks();
  jest.replaceProperty(process, 'env', { ...process.env, STRIPE_WEBHOOK_SECRET: secret });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockBuffer.mockResolvedValue(requestBody);
  res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
});

afterEach(() => jest.restoreAllMocks());

it('rejects a webhook when Stripe signature verification fails', async () => {
  mockConstructEvent.mockImplementation(() => {
    throw new Error('No signatures found');
  });

  await handler(request, res);

  expect(mockBuffer).toHaveBeenCalledTimes(1);
  expect(mockConstructEvent).toHaveBeenCalledWith(requestBody, 'fixture_signature', secret);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Invalid Stripe signature.' });
  expect(fulfillStripeEvent).not.toHaveBeenCalled();
});

it.each([
  'checkout.session.completed',
  'customer.subscription.trial_will_end',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
])('acknowledges verified %s after passing it to fulfillment', async type => {
  const event = { type, livemode: false, data: { object: { id: 'object_fixture' } } };
  mockConstructEvent.mockReturnValue(event);

  await handler(request, res);

  expect(fulfillStripeEvent).toHaveBeenCalledWith(expect.any(Object), expect.any(Object), 'test', event);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ received: true });
});

it('returns a retryable response when processing a verified event fails', async () => {
  mockConstructEvent.mockReturnValue({ id: 'evt_fixture', type: 'invoice.paid', livemode: false });
  fulfillStripeEvent.mockRejectedValueOnce(new Error('Fixture backend failure'));
  await handler(request, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ error: 'Webhook is temporarily unavailable.' });
});
