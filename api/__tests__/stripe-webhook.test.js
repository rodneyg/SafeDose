/* eslint-env jest */

const mockConstructEvent = jest.fn();
const mockBuffer = jest.fn();

jest.mock('stripe', () => jest.fn(() => ({
  webhooks: { constructEvent: mockConstructEvent },
})));
jest.mock('micro', () => ({ buffer: mockBuffer }));
jest.mock('../../lib/stripeConfig.server.js', () => ({
  secretKey: 'sk_mock_not_a_key',
  mode: 'test',
}));

const handler = require('../stripe-webhook');

const requestBody = Buffer.from('{"mock":"payload"}');
let res;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  mockBuffer.mockResolvedValue(requestBody);
  res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
    json: jest.fn(),
  };
});

afterEach(() => jest.restoreAllMocks());

it('rejects a webhook when Stripe signature verification fails', async () => {
  mockConstructEvent.mockImplementation(() => {
    throw new Error('No signatures found');
  });

  await handler({ headers: { 'stripe-signature': 'invalid_signature' } }, res);

  expect(mockBuffer).toHaveBeenCalledTimes(1);
  expect(mockConstructEvent.mock.calls[0].slice(0, 2)).toEqual([
    requestBody,
    'invalid_signature',
  ]);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.send).toHaveBeenCalledWith('Webhook Error: No signatures found');
  expect(res.json).not.toHaveBeenCalled();
});

it.each([
  ['checkout.session.completed', { id: 'cs_mock', metadata: { source: 'pricing' } }, [
    ['Received event:', 'checkout.session.completed', 'cs_mock'],
    ['Session metadata:', { source: 'pricing' }],
  ]],
  ['customer.subscription.trial_will_end', { id: 'sub_trial' }, [
    ['Trial ending soon for subscription:', 'sub_trial'],
  ]],
  ['customer.subscription.updated', { id: 'sub_updated' }, [
    ['Subscription updated:', 'sub_updated'],
  ]],
  ['customer.subscription.deleted', { id: 'sub_deleted' }, [
    ['Subscription cancelled:', 'sub_deleted'],
  ]],
])('acknowledges and handles %s', async (type, object, expectedLogs) => {
  mockConstructEvent.mockReturnValue({ type, data: { object } });

  await handler({ headers: { 'stripe-signature': 'valid_signature' } }, res);

  expectedLogs.forEach(args => expect(console.log).toHaveBeenCalledWith(...args));
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ received: true });
});

it('logs the trial end when a new subscription includes one', async () => {
  const trialEnd = 1_800_000_000;
  mockConstructEvent.mockReturnValue({
    type: 'customer.subscription.created',
    data: { object: { id: 'sub_new', trial_end: trialEnd } },
  });

  await handler({ headers: { 'stripe-signature': 'valid_signature' } }, res);

  expect(console.log).toHaveBeenCalledWith('New subscription created:', 'sub_new');
  expect(console.log).toHaveBeenCalledWith(
    'Subscription has trial ending at:',
    new Date(trialEnd * 1000)
  );
  expect(res.status).toHaveBeenCalledWith(200);
});

it('handles a new subscription without logging a trial end', async () => {
  mockConstructEvent.mockReturnValue({
    type: 'customer.subscription.created',
    data: { object: { id: 'sub_without_trial' } },
  });

  await handler({ headers: { 'stripe-signature': 'valid_signature' } }, res);

  expect(console.log).toHaveBeenCalledTimes(1);
  expect(console.log).toHaveBeenCalledWith('New subscription created:', 'sub_without_trial');
  expect(res.json).toHaveBeenCalledWith({ received: true });
});

it('acknowledges and reports an unhandled event type', async () => {
  mockConstructEvent.mockReturnValue({
    type: 'invoice.paid',
    data: { object: { id: 'in_mock' } },
  });

  await handler({ headers: { 'stripe-signature': 'valid_signature' } }, res);

  expect(console.log).toHaveBeenCalledWith('Unhandled event type: invoice.paid');
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ received: true });
});
