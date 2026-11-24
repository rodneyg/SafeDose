/* eslint-env jest */
const mockCreate = jest.fn();
const mockStoreCheckout = jest.fn();
const mockGetCustomer = jest.fn();
const mockBillingUser = jest.fn();
jest.mock('stripe', () => jest.fn(() => ({ checkout: { sessions: { create: mockCreate } } })));
jest.mock('../../lib/stripeConfig.server', () => ({ secretKey: 'sk_test_placeholder', mode: 'test' }));
jest.mock('../../lib/firebaseAdmin.server', () => ({ getBillingFirebase: jest.fn() }));
jest.mock('../../lib/billing.server', () => ({
  ...jest.requireActual('../../lib/billing.server'),
  billingUser: (...args) => mockBillingUser(...args),
  getOrCreateCustomer: (...args) => mockGetCustomer(...args),
  billingRefs: () => ({ checkout: () => ({ create: mockStoreCheckout }) }),
}));
jest.mock('../../lib/photoCheckStripe', () => ({ resolveCheckoutPriceId: jest.fn() }));
const { resolveCheckoutPriceId } = require('../../lib/photoCheckStripe');
const handler = require('../create-checkout-session');

const origin = 'https://safedose.rodneygainous.com';
const urls = { successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: `${origin}/pricing` };
let res;
const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_checkout_fixture';
  res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  mockCreate.mockResolvedValue({ id: 'cs_checkout' });
  mockBillingUser.mockResolvedValue({ uid: 'buyer', db: {} });
  mockGetCustomer.mockResolvedValue('cus_buyer');
});
afterEach(() => {
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  jest.restoreAllMocks();
});

it.each(['photo_check_monthly', 'photo_check_annual'])('binds %s to the authenticated account without a trial', async offerKey => {
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_photo', offerKey });
  await handler({ method: 'POST', body: { offerKey, priceId: null, hasTrial: true, uid: 'another-user', ...urls } }, res);
  expect(mockCreate).toHaveBeenCalledWith({
    mode: 'subscription',
    customer: 'cus_buyer',
    client_reference_id: 'buyer',
    line_items: [{ price: 'price_photo', quantity: 1 }],
    success_url: urls.successUrl,
    cancel_url: urls.cancelUrl,
    metadata: { source: offerKey, offerKey },
  });
  expect(mockStoreCheckout).toHaveBeenCalledWith({ uid: 'buyer', customerId: 'cus_buyer', status: 'pending', trial: false });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ sessionId: 'cs_checkout' });
});

it('preserves the legacy Full Pro seven-day trial', async () => {
  const priceId = 'price_1RUHgxAY2p4W374Yb5EWEtZ0';
  resolveCheckoutPriceId.mockResolvedValue({ priceId });
  await handler({ method: 'POST', body: { priceId, hasTrial: true, ...urls } }, res);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
  }));
  expect(mockStoreCheckout).toHaveBeenCalledWith(expect.objectContaining({ trial: true }));
});

it.each(['offerKey', 'successUrl', 'cancelUrl'])('rejects missing %s', async missing => {
  const body = { offerKey: 'photo_check_monthly', ...urls };
  delete body[missing];
  await handler({ method: 'POST', body }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([null, 'body', [], 42, { offerKey: 42, ...urls }, { priceId: {}, ...urls },
  { ...urls, offerKey: 'photo_check_monthly', successUrl: 42 },
])('rejects malformed checkout input %p before authentication', async body => {
  await handler({ method: 'POST', body }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockBillingUser).not.toHaveBeenCalled();
  expect(resolveCheckoutPriceId).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([['offerKey', 'unknown_offer'], ['priceId', 'price_unexpected']])(
  'returns a bad request for an unexpected %s', async (field, value) => {
    resolveCheckoutPriceId.mockRejectedValueOnce(Object.assign(new Error('Unsupported offer'), { statusCode: 400 }));
    await handler({ method: 'POST', body: { [field]: value, ...urls } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCreate).not.toHaveBeenCalled();
  },
);

it('rejects return URLs outside SafeDose', async () => {
  await handler({ method: 'POST', body: { ...urls, offerKey: 'photo_check_monthly', cancelUrl: 'https://example.org/pricing' } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockCreate).not.toHaveBeenCalled();
});

it('does not open checkout when webhook verification is unconfigured', async () => {
  delete process.env.STRIPE_WEBHOOK_SECRET;
  await handler({ method: 'POST', body: { offerKey: 'photo_check_monthly', ...urls } }, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(mockGetCustomer).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});

it('returns a service error if Stripe fails', async () => {
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_photo', offerKey: 'photo_check_monthly' });
  mockCreate.mockRejectedValueOnce(new Error('Upstream diagnostic'));
  await handler({ method: 'POST', body: { offerKey: 'photo_check_monthly', ...urls } }, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
});

it('rejects non-POST methods', async () => {
  await handler({ method: 'GET' }, res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
  expect(mockCreate).not.toHaveBeenCalled();
});

it('returns a non-cacheable 429 before Stripe after 30 requests from one client', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(100_000);
  const body = { offerKey: 'photo_check_monthly', ...urls };
  const req = { method: 'POST', body, socket: { remoteAddress: '192.0.2.10' } };
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_mock', offerKey: body.offerKey });
  for (let i = 0; i < 30; i++) {
    await handler(req, res);
  }
  expect(res.status).toHaveBeenLastCalledWith(200);
  await handler(req, res);
  expect(res.status).toHaveBeenLastCalledWith(429);
  expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(mockCreate).toHaveBeenCalledTimes(30);
});
