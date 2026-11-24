const Stripe = require('stripe');
const { getBillingFirebase } = require('../../lib/firebaseAdmin.server');
const handler = require('../validate-session');

jest.mock('stripe', () => jest.fn());
jest.mock('../../lib/firebaseAdmin.server', () => ({ getBillingFirebase: jest.fn() }));

const verifyIdToken = jest.fn();
const getAll = jest.fn();
const sessionId = 'cs_test_mock123';
const checkout = {
  uid: 'buyer', customerId: 'cus_buyer', status: 'confirmed', subscriptionId: 'sub_buyer',
};
const account = { customerId: 'cus_buyer', activeSubscriptionIds: ['sub_buyer'] };
const snapshot = data => ({ data: () => data });

let req;
let res;
let client = 0;

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  verifyIdToken.mockResolvedValue({ uid: 'buyer', firebase: { sign_in_provider: 'google.com' } });
  getAll.mockResolvedValue([snapshot(checkout), snapshot(account)]);
  const doc = id => ({ id, collection: () => ({ doc }) });
  getBillingFirebase.mockReturnValue({ auth: { verifyIdToken }, db: { collection: () => ({ doc }), getAll } });
  client += 1;
  req = {
    method: 'POST',
    headers: { authorization: 'Bearer fixture-token' },
    body: { session_id: sessionId },
    socket: { remoteAddress: `192.0.2.${client}` },
  };
  res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
});

afterEach(() => jest.restoreAllMocks());

it('rejects non-POST methods', async () => {
  await handler({ ...req, method: 'GET' }, res);
  expect(res.status).toHaveBeenCalledWith(405);
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST');
  expect(Stripe).not.toHaveBeenCalled();
});

it('rate limits the 31st request from the same client', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(100_000);
  for (let index = 0; index < 30; index++) {
    await handler(req, res);
  }
  expect(res.status).toHaveBeenLastCalledWith(200);
  await handler(req, res);
  expect(res.status).toHaveBeenLastCalledWith(429);
  expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(getAll).toHaveBeenCalledTimes(30);
});

it('requires a verified owner before loading the checkout record', async () => {
  await handler({ ...req, headers: {} }, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(getAll).not.toHaveBeenCalled();
  expect(Stripe).not.toHaveBeenCalled();
});

it.each([undefined, null, 42, 'raw body', [], {}])('rejects a missing session ID in body %j', async body => {
  await handler({ ...req, body }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing session_id parameter' });
  expect(Stripe).not.toHaveBeenCalled();
});

it.each([42, false, {}, [sessionId], '', '   ', 'pi_test_mock', 'cs_', 'cs_test-1', 'cs_test a', 'cs_' + 'a'.repeat(198)])(
  'rejects an invalid session ID %j before calling Stripe',
  async session_id => {
    await handler({ ...req, body: { session_id } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session_id parameter' });
    expect(Stripe).not.toHaveBeenCalled();
    expect(getAll).not.toHaveBeenCalled();
  }
);

it.each([sessionId, 'cs_' + 'a'.repeat(197)])('validates a confirmed subscription after trimming %s', async id => {
  await handler({ ...req, body: { session_id: ` ${id} ` } }, res);
  expect(getAll).toHaveBeenCalledWith({ id, collection: expect.any(Function) }, { id: 'buyer', collection: expect.any(Function) });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ isValid: true, status: 'active' });
  expect(Stripe).not.toHaveBeenCalled();
});

it.each(['pending', 'failed'])('returns false for a %s checkout', async status => {
  getAll.mockResolvedValue([snapshot({ ...checkout, status }), snapshot(account)]);
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ isValid: false, status });
});

it('returns false for a confirmed checkout with an inactive subscription', async () => {
  getAll.mockResolvedValue([snapshot(checkout), snapshot({ ...account, activeSubscriptionIds: [] })]);
  await handler(req, res);
  expect(res.json).toHaveBeenCalledWith({ isValid: false, status: 'inactive' });
});

it('sanitizes Firestore errors in the response and logs', async () => {
  getAll.mockRejectedValue(new Error('Backend error with sensitive mock value'));
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith('[billing] checkout status failed');
});
