const mockCreate = jest.fn();
const mockRead = jest.fn();
const mockDoc = jest.fn(() => ({ create: mockCreate, get: mockRead }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
const mockVerify = jest.fn();
jest.mock('firebase-admin/app', () => ({
  cert: jest.fn(),
  getApps: () => [],
  initializeApp: () => ({}),
}));
jest.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: mockVerify }) }));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'server timestamp' },
  getFirestore: jest.fn(() => ({ collection: mockCollection })),
}));

const handler = require('../upgrade-email');
const { getFirestore } = require('firebase-admin/firestore');
const originalEnv = process.env;
const headers = { authorization: 'Bearer test-token', 'content-type': 'application/json' };
let testClient = 0;

async function request(options = {}) {
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    end: jest.fn(),
  };
  const socket = { remoteAddress: '192.0.2.' + testClient };
  await handler({ method: 'POST', headers, body: { email: 'person@example.test' }, socket, ...options }, res);
  return res;
}

beforeEach(() => {
  testClient++;
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    UPGRADE_EMAIL_FIREBASE_PROJECT_ID: 'project',
    UPGRADE_EMAIL_FIREBASE_CLIENT_EMAIL: 'service@example.test',
    UPGRADE_EMAIL_FIREBASE_PRIVATE_KEY: 'test-only',
    UPGRADE_EMAIL_DATABASE_ID: 'private-leads',
  };
  mockVerify.mockResolvedValue({ uid: 'guest-id', firebase: { sign_in_provider: 'anonymous' } });
  mockCreate.mockResolvedValue(undefined);
});

afterEach(() => {
  process.env = originalEnv;
  jest.restoreAllMocks();
});

it('stays disabled without a dedicated database', async () => {
  process.env.UPGRADE_EMAIL_DATABASE_ID = '(default)';
  const availability = await request({ method: 'GET' });
  expect(availability.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(availability.json).toHaveBeenCalledWith({ enabled: false });
  expect((await request()).status).toHaveBeenCalledWith(503);
  expect(mockVerify).not.toHaveBeenCalled();
});

it.each([
  [{ method: 'DELETE' }, 405],
  [{ headers: {} }, 401],
  [{ headers: { authorization: headers.authorization } }, 415],
  [{ body: { email: 'invalid' } }, 400],
  [{ body: { email: 'person@example.test', userType: 'google' } }, 400],
])('rejects invalid requests and never records a lead (%#)', async (options, status) => {
  expect((await request(options)).status).toHaveBeenCalledWith(status);
  expect(mockCreate).not.toHaveBeenCalled();
});

it('rejects an invalid Firebase token', async () => {
  mockVerify.mockRejectedValue(new Error('invalid token'));
  expect((await request()).status).toHaveBeenCalledWith(401);
  expect(mockCreate).not.toHaveBeenCalled();
});

it.each([['anonymous', 'anon'], ['google.com', 'google']])(
  'stores the minimum consent record for %s',
  async (provider, userType) => {
    mockVerify.mockResolvedValue({ uid: 'session-id', firebase: { sign_in_provider: provider } });
    const res = await request({ body: { email: ' Person@EXAMPLE.test ' } });
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.json).not.toHaveBeenCalled();
    expect(mockVerify).toHaveBeenCalledWith('test-token');
    expect(getFirestore).toHaveBeenCalledWith(expect.anything(), 'private-leads');
    expect(mockCollection).toHaveBeenCalledWith('leads');
    expect(mockDoc).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
    expect(mockCreate).toHaveBeenCalledWith({
      email: 'Person@example.test',
      timestamp: 'server timestamp',
      scanLimitHit: true,
      userType,
      source: 'upgrade_modal',
    });
  },
);

it('treats an identical retry as success without replacing the original consent', async () => {
  mockCreate.mockRejectedValue({ code: 6 });
  mockRead.mockResolvedValue({ get: () => 'person@example.test' });
  expect((await request()).status).toHaveBeenCalledWith(204);
  expect((await request({ body: { email: 'other@example.test' } })).status).toHaveBeenCalledWith(409);
  expect(mockDoc.mock.calls[0]).toEqual(mockDoc.mock.calls[1]);
});

it('keeps provider error details out of logs and responses', async () => {
  mockCreate.mockRejectedValue(new Error('person@example.test'));
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await request();
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith('[upgrade-email] Unable to save consent.');
});

it('limits repeated POSTs before verifying the token and keeps GET available', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(100_000);
  for (let i = 0; i < 10; i++) {
    expect((await request()).status).toHaveBeenCalledWith(204);
  }
  const limited = await request();
  expect(limited.status).toHaveBeenCalledWith(429);
  expect(limited.setHeader).toHaveBeenCalledWith('Retry-After', '60');
  expect(mockVerify).toHaveBeenCalledTimes(10);
  expect(mockCreate).toHaveBeenCalledTimes(10);
  expect((await request({ method: 'GET' })).json).toHaveBeenCalledWith({ enabled: true });
});
