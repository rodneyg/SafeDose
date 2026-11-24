/* eslint-env jest */

const mockStripeInstance = {};
const mockStripe = jest.fn(() => mockStripeInstance);
const mockGetBillingFirebase = jest.fn();

jest.mock('stripe', () => mockStripe);
jest.mock('./stripeConfig.server', () => ({ mode: 'test', secretKey: 'sk_test_fixture' }));
jest.mock('./firebaseAdmin.server', () => ({ getBillingFirebase: () => mockGetBillingFirebase() }));

const stripeConfig = require('./stripeConfig.server');
const {
  billingError,
  billingFailure,
  billingRefs,
  billingReturnOrigin,
  billingStripe,
  billingUser,
  getOrCreateCustomer,
} = require('./billing.server');

function document(path, data) {
  return {
    path,
    get: jest.fn().mockResolvedValue({ data: () => data }),
    collection: name => collection(`${path}/${name}`),
  };
}

function collection(path) {
  return { doc: id => document(`${path}/${id}`) };
}

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('billing.server', () => {
  const originalVercelEnv = process.env.VERCEL_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    stripeConfig.mode = 'test';
    stripeConfig.secretKey = 'sk_test_fixture';
    delete process.env.VERCEL_ENV;
  });

  afterAll(() => {
    if (originalVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnv;
  });

  test('creates a configured Stripe client and rejects a key for the wrong mode', () => {
    expect(billingStripe()).toBe(mockStripeInstance);
    expect(mockStripe).toHaveBeenCalledWith('sk_test_fixture', {
      apiVersion: '2025-03-31.basil',
      timeout: 10000,
      maxNetworkRetries: 1,
    });

    stripeConfig.secretKey = 'sk_live_fixture';
    expect(billingStripe).toThrow(expect.objectContaining({
      billingStatus: 503,
      message: 'Payments are temporarily unavailable.',
    }));
  });

  test('builds mode-scoped references and encodes account IDs', () => {
    const refs = billingRefs({ collection }, 'live');

    expect(refs.account('user/name@example.com').path)
      .toBe('stripeBilling/live/accounts/user%2Fname%40example.com');
    expect(refs.customer('cus_1').path).toBe('stripeBilling/live/customers/cus_1');
    expect(refs.checkout('cs_1').path).toBe('stripeBilling/live/checkouts/cs_1');
    expect(refs.event('evt_1').path).toBe('stripeBilling/live/events/evt_1');
  });

  test.each([
    [{ headers: {} }, 'missing credentials'],
    [{ headers: { authorization: 'Basic token' } }, 'malformed authorization'],
  ])('rejects %s', async (req) => {
    await expect(billingUser(req)).rejects.toMatchObject({ billingStatus: 401 });
    expect(mockGetBillingFirebase).not.toHaveBeenCalled();
  });

  test('accepts a bearer token and returns the verified user and database', async () => {
    const db = {};
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'user-1',
      firebase: { sign_in_provider: 'google.com' },
    }) };
    mockGetBillingFirebase.mockReturnValue({ auth, db });

    await expect(billingUser({ headers: { authorization: 'bearer token-1' } }))
      .resolves.toEqual({ uid: 'user-1', db });
    expect(auth.verifyIdToken).toHaveBeenCalledWith('token-1', true);
  });

  test('accepts the legacy body token when the authorization header is absent', async () => {
    const db = {};
    const auth = { verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'user-2',
      firebase: { sign_in_provider: 'password' },
    }) };
    mockGetBillingFirebase.mockReturnValue({ auth, db });

    await expect(billingUser({ headers: {}, body: { idToken: 'body-token' } }))
      .resolves.toEqual({ uid: 'user-2', db });
  });

  test.each([
    [Object.assign(new Error('expired'), { code: 'auth/id-token-expired' }), 401],
    [new Error('Firebase unavailable'), undefined],
  ])('handles token verification failures', async (error, billingStatus) => {
    const auth = { verifyIdToken: jest.fn().mockRejectedValue(error) };
    mockGetBillingFirebase.mockReturnValue({ auth, db: {} });

    await expect(billingUser({ body: { idToken: 'token' } })).rejects
      .toMatchObject(billingStatus ? { billingStatus } : { message: error.message });
  });

  test.each([
    { uid: '', firebase: { sign_in_provider: 'google.com' } },
    { uid: 'guest', firebase: { sign_in_provider: 'anonymous' } },
    { uid: 'user-without-provider' },
  ])('rejects an ineligible verified identity', async (user) => {
    mockGetBillingFirebase.mockReturnValue({
      auth: { verifyIdToken: jest.fn().mockResolvedValue(user) },
      db: {},
    });

    await expect(billingUser({ body: { idToken: 'token' } })).rejects
      .toMatchObject({ billingStatus: 401 });
  });

  test('reuses an existing customer without calling Stripe or a transaction', async () => {
    const accountRef = document('account', { customerId: 'cus_existing' });
    const db = {
      collection: () => ({ doc: () => ({
        collection: () => ({ doc: () => accountRef }),
      }) }),
      runTransaction: jest.fn(),
    };
    const stripe = { customers: { create: jest.fn() } };

    await expect(getOrCreateCustomer(stripe, db, 'user-1')).resolves.toBe('cus_existing');
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(db.runTransaction).not.toHaveBeenCalled();
  });

  test('creates and persists a customer with an idempotency key', async () => {
    const refs = {};
    const accountRef = { get: jest.fn().mockResolvedValue({ data: () => undefined }) };
    const root = {
      collection: name => ({ doc: id => {
        const ref = { name, id };
        refs[`${name}/${id}`] = ref;
        return name === 'accounts' ? Object.assign(accountRef, ref) : ref;
      } }),
    };
    const transaction = {
      get: jest.fn().mockResolvedValue({ data: () => undefined }),
      create: jest.fn(),
      set: jest.fn(),
    };
    const db = {
      collection: () => ({ doc: () => root }),
      runTransaction: jest.fn(callback => callback(transaction)),
    };
    const stripe = { customers: { create: jest.fn().mockResolvedValue({ id: 'cus_new' }) } };

    await expect(getOrCreateCustomer(stripe, db, 'user-1')).resolves.toBe('cus_new');
    expect(stripe.customers.create).toHaveBeenCalledWith(
      { metadata: { safeDoseUid: 'user-1' } },
      { idempotencyKey: expect.stringMatching(/^safedose-customer-[a-f0-9]{64}$/) },
    );
    expect(transaction.create).toHaveBeenCalledWith(refs['customers/cus_new'], { uid: 'user-1' });
    expect(transaction.set).toHaveBeenCalledWith(accountRef, { customerId: 'cus_new' }, { merge: true });
  });

  test('uses a customer created by a concurrent transaction', async () => {
    const accountRef = { get: jest.fn().mockResolvedValue({ data: () => undefined }) };
    const root = { collection: () => ({ doc: () => accountRef }) };
    const transaction = {
      get: jest.fn().mockResolvedValue({ data: () => ({ customerId: 'cus_winner' }) }),
      create: jest.fn(),
      set: jest.fn(),
    };
    const db = {
      collection: () => ({ doc: () => root }),
      runTransaction: jest.fn(callback => callback(transaction)),
    };
    const stripe = { customers: { create: jest.fn().mockResolvedValue({ id: 'cus_loser' }) } };

    await expect(getOrCreateCustomer(stripe, db, 'user-1')).resolves.toBe('cus_winner');
    expect(transaction.create).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
  });

  test.each([
    ['https://safedose.rodneygainous.com/pricing', '/pricing', 'https://safedose.rodneygainous.com'],
    ['https://safe-dose.vercel.app/success', '/success', 'https://safe-dose.vercel.app'],
    [
      'https://safe-dose-feature-1-rodneygs-projects.vercel.app/pricing',
      '/pricing',
      'https://safe-dose-feature-1-rodneygs-projects.vercel.app',
    ],
    ['http://localhost:3000/pricing?source=settings', '/pricing', 'http://localhost:3000'],
  ])('returns the origin for an allowed return URL', (url, path, expectedOrigin) => {
    expect(billingReturnOrigin(url, path)).toBe(expectedOrigin);
  });

  test.each([
    [undefined, '/pricing'],
    ['not a URL', '/pricing'],
    ['https://evil.example/pricing', '/pricing'],
    ['https://user:password@safedose.rodneygainous.com/pricing', '/pricing'],
    ['https://safedose.rodneygainous.com:444/pricing', '/pricing'],
    ['https://safedose.rodneygainous.com/other', '/pricing'],
  ])('rejects an unsafe return URL', (url, path) => {
    expect(() => billingReturnOrigin(url, path)).toThrow(expect.objectContaining({ billingStatus: 400 }));
  });

  test('disallows localhost in production or when explicitly disabled', () => {
    process.env.VERCEL_ENV = 'production';
    expect(() => billingReturnOrigin('http://localhost:3000/pricing', '/pricing')).toThrow();
    delete process.env.VERCEL_ENV;
    expect(() => billingReturnOrigin('http://localhost:3000/pricing', '/pricing', { allowLocal: false })).toThrow();
  });

  test('returns known errors and hides unexpected error details', () => {
    const knownResponse = response();
    billingFailure(knownResponse, 'checkout', billingError(400, 'Invalid request.'));
    expect(knownResponse.status).toHaveBeenCalledWith(400);
    expect(knownResponse.json).toHaveBeenCalledWith({ error: 'Invalid request.' });

    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const unknownResponse = response();
    billingFailure(unknownResponse, 'checkout', new Error('secret detail'));
    expect(log).toHaveBeenCalledWith('[billing] checkout failed');
    expect(unknownResponse.status).toHaveBeenCalledWith(503);
    expect(unknownResponse.json).toHaveBeenCalledWith({ error: 'Payments are temporarily unavailable.' });
    log.mockRestore();
  });
});
