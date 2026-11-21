/* eslint-env jest */
const mockCreate = jest.fn();
jest.mock('stripe', () => jest.fn(() => ({ checkout: { sessions: { create: mockCreate } } })));
jest.mock('../../lib/stripeConfig.server.js', () => ({ secretKey: 'sk_mock_not_a_key', mode: 'test' }));
jest.mock('../../lib/photoCheckStripe', () => ({ resolveCheckoutPriceId: jest.fn() }));
const { resolveCheckoutPriceId } = require('../../lib/photoCheckStripe');
const handler = require('../create-checkout-session');
let res;
const urls = { successUrl: 'https://safedose.example/success?session_id={CHECKOUT_SESSION_ID}', cancelUrl: 'https://safedose.example/pricing' };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  mockCreate.mockResolvedValue({ id: 'cs_mock' });
});
afterEach(() => jest.restoreAllMocks());
it.each(['photo_check_monthly', 'photo_check_annual'])('builds a subscription for %s without a trial', async offerKey => {
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_mock', offerKey });
  await handler({ method: 'POST', body: { offerKey, priceId: null, hasTrial: true, ...urls } }, res);
  expect(resolveCheckoutPriceId).toHaveBeenCalledWith(expect.any(Object), { offerKey, priceId: null }, expect.objectContaining({ mode: 'test' }));
  expect(mockCreate).toHaveBeenCalledWith({ mode: 'subscription',
    line_items: [{ price: 'price_mock', quantity: 1 }], success_url: urls.successUrl,
    cancel_url: urls.cancelUrl, metadata: { source: offerKey, offerKey } });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ sessionId: 'cs_mock' });
});
it('preserves legacy price and seven-day trial requests', async () => {
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_legacy' });
  await handler({ method: 'POST', body: { priceId: 'price_legacy', hasTrial: true, ...urls } }, res);
  expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
    line_items: [{ price: 'price_legacy', quantity: 1 }], subscription_data: { trial_period_days: 7 },
    metadata: { source: 'full_pro_trial', offerKey: '' },
  }));
});
it.each(['offer', 'success', 'cancel'])('rejects missing %s before creating a session', async missing => {
  const body = { offerKey: 'photo_check_monthly', ...urls };
  if (missing === 'offer') body.offerKey = undefined;
  if (missing === 'success') body.successUrl = undefined;
  if (missing === 'cancel') body.cancelUrl = undefined;
  await handler({ method: 'POST', body }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockCreate).not.toHaveBeenCalled();
  expect(resolveCheckoutPriceId).not.toHaveBeenCalled();
});
it('returns checkout failure to the caller', async () => {
  resolveCheckoutPriceId.mockResolvedValue({ priceId: 'price_mock', offerKey: 'photo_check_monthly' });
  mockCreate.mockRejectedValue(new Error('Checkout temporarily unavailable'));
  await handler({ method: 'POST', body: { offerKey: 'photo_check_monthly', ...urls } }, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Checkout temporarily unavailable' });
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
