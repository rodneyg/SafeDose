const Stripe = require('stripe');
const stripeConfig = require('../../lib/stripeConfig.server.js');
const handler = require('../validate-session');

jest.mock('stripe', () => jest.fn());
jest.mock('../../lib/stripeConfig.server.js', () => ({ mode: 'test' }));

const retrieve = jest.fn();
const paidSession = { payment_status: 'paid', mode: 'subscription' };
const sessionId = 'cs_test_mock123';
let req;
let res;
let client = 0;

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  stripeConfig.secretKey = 'sk_test_mock';
  Stripe.mockImplementation(() => ({ checkout: { sessions: { retrieve } } }));
  retrieve.mockResolvedValue(paidSession);
  client += 1;
  req = { method: 'POST', body: { session_id: sessionId }, socket: { remoteAddress: `192.0.2.${client}` } };
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
  expect(retrieve).toHaveBeenCalledTimes(30);
});

it.each([undefined, 'bad_mock', 'pk_test_mock'])('returns a generic error for invalid Stripe configuration (%s)', async key => {
  stripeConfig.secretKey = key;
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Payment system unavailable', isValid: false });
  expect(console.error).toHaveBeenCalledWith('Invalid Stripe configuration for session validation');
  expect(Stripe).not.toHaveBeenCalled();
});

it.each([undefined, null, 42, 'raw body', [], {}])('rejects a missing session ID in body %j', async body => {
  await handler({ ...req, body }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({ error: 'Missing session_id parameter', isValid: false });
  expect(Stripe).not.toHaveBeenCalled();
});

it.each([42, false, {}, [sessionId], '', '   ', 'pi_test_mock', 'cs_', 'cs_test-1', 'cs_test a', 'cs_' + 'a'.repeat(198)])(
  'rejects an invalid session ID %j before calling Stripe',
  async session_id => {
    await handler({ ...req, body: { session_id } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid session_id parameter', isValid: false });
    expect(Stripe).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  }
);

it.each([sessionId, 'cs_' + 'a'.repeat(197)])('validates a paid subscription after trimming %s', async id => {
  await handler({ ...req, body: { session_id: ` ${id} ` } }, res);
  expect(retrieve).toHaveBeenCalledWith(id);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ isValid: true, paymentStatus: 'paid', mode: 'subscription' });
});

it.each([
  { ...paidSession, payment_status: 'unpaid' },
  { ...paidSession, mode: 'payment' },
  {},
  null,
  'unexpected',
])('returns a boolean false for an invalid Stripe response %j', async session => {
  retrieve.mockResolvedValue(session);
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isValid: false }));
});

it.each(['initialization', 'retrieval'])('sanitizes Stripe %s errors in the response and logs', async stage => {
  const error = new Error('SDK error with sensitive mock value');
  if (stage === 'initialization') {
    Stripe.mockImplementation(() => { throw error; });
  } else {
    retrieve.mockRejectedValue(error);
  }
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({ error: 'Unable to validate checkout session', isValid: false });
  expect(console.error).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith(
    stage === 'initialization' ? 'Failed to initialize Stripe for session validation' : 'Failed to retrieve Stripe checkout session'
  );
});
