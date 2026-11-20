const mockCreate = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();

jest.mock('stripe', () => jest.fn(() => ({
  billingPortal: { sessions: { create: mockCreate } },
})));
jest.mock('../../lib/firebaseAdmin.server', () => ({
  getBillingFirebase: () => ({
    auth: { verifyIdToken: mockVerifyIdToken },
    db: { collection: () => ({ doc: () => ({ get: mockGet, collection: () => ({ doc: () => ({ get: mockGet }) }) }) }) },
  }),
}));
jest.mock('../../lib/stripeConfig.server.js', () => ({ secretKey: 'sk_test_portal', mode: 'test' }));

const handler = require('../create-portal-session');

function response() {
  return { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

const request = body => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body });

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyIdToken.mockResolvedValue({ uid: 'user-1', firebase: { sign_in_provider: 'google.com' } });
  mockGet.mockResolvedValue({ exists: true, data: () => ({ customerId: 'cus_owned' }) });
  mockCreate.mockResolvedValue({ id: 'bps_1', url: 'https://billing.stripe.com/session/1' });
});

it('rejects a missing ID token', async () => {
  const res = response();
  await handler(request({}), res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(mockCreate).not.toHaveBeenCalled();
});

it('rejects an invalid token', async () => {
  mockVerifyIdToken.mockRejectedValueOnce(Object.assign(new Error('Invalid token'), { code: 'auth/invalid-id-token' }));
  const res = response();
  await handler(request({ idToken: 'wrong-user-token' }), res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(mockGet).not.toHaveBeenCalled();
});

it('rejects a caller without their own Stripe customer', async () => {
  mockGet.mockResolvedValue({ exists: true, data: () => ({ customerId: null }) });
  const res = response();
  await handler(request({ idToken: 'valid-token' }), res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([null, [], { idToken: 42 }, { idToken: 'valid-token', customerId: 'cus_someone_else' }])(
  'rejects malformed body %#', async body => {
    const res = response();
    await handler(request(body), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

it.each([
  'https://evil.example/settings',
  'https://safe-dose.vercel.app.evil.example/settings',
  'javascript:alert(1)',
  'http://localhost:4321/settings',
  'https://safe-dose.vercel.app/pricing',
])('rejects hostile return URL %s', async returnUrl => {
  const res = response();
  await handler(request({ idToken: 'valid-token', returnUrl }), res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(mockVerifyIdToken).not.toHaveBeenCalled();
});

it('uses the authenticated user customer and an allowed return URL', async () => {
  const returnUrl = 'https://safe-dose.vercel.app/settings?from=portal';
  const res = response();
  await handler(request({ idToken: 'valid-token', returnUrl }), res);
  expect(mockCreate).toHaveBeenCalledWith({ customer: 'cus_owned', return_url: returnUrl });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
});

it('applies the shared rate limit before authenticating a portal request', async () => {
  const req = { ...request({ idToken: 'valid-token' }), socket: { remoteAddress: '192.0.2.1' } };
  for (let attempt = 0; attempt < 30; attempt++) {
    await handler(req, response());
  }
  jest.clearAllMocks();

  const res = response();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(429);
  expect(mockVerifyIdToken).not.toHaveBeenCalled();
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([
  [{ type: 'StripeInvalidRequestError' }, 400, 'Invalid request to Stripe'],
  [new Error('unavailable'), 503, 'Payments are temporarily unavailable.'],
])('handles Stripe errors', async (error, status, message) => {
  mockCreate.mockRejectedValue(error);
  const res = response();
  await handler(request({ idToken: 'valid-token' }), res);
  expect(res.status).toHaveBeenCalledWith(status);
  expect(res.json).toHaveBeenCalledWith({ error: message });
});
