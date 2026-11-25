const TEST_PRICE_DEFAULT = 'price_1REyzMPE5x6FmwJPyJVJIEXe';
const LIVE_PRICE_DEFAULT = 'price_1RUHgxAY2p4W374Yb5EWEtZ0';

const ENV_KEYS = [
  'STRIPE_MODE',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_TEST_PUBLISHABLE_KEY',
  'STRIPE_TEST_SECRET_KEY',
  'STRIPE_TEST_PRICE_ID',
  'STRIPE_LIVE_PUBLISHABLE_KEY',
  'STRIPE_LIVE_SECRET_KEY',
  'STRIPE_LIVE_PRICE_ID',
];

describe('lib/stripeConfig.server.js', () => {
  const savedEnv = {};

  beforeEach(() => {
    jest.resetModules();
    // Do not let a local .env file change the values under test.
    jest.doMock('dotenv', () => ({ config: jest.fn() }), { virtual: true });
    ENV_KEYS.forEach((key) => {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    });
    jest.restoreAllMocks();
    jest.dontMock('dotenv');
  });

  const load = () => require('./stripeConfig.server');

  it('uses test mode and the test price when nothing is set', () => {
    const config = load();
    expect(config.mode).toBe('test');
    expect(config.priceId).toBe(TEST_PRICE_DEFAULT);
    expect(config.publishableKey).toBeUndefined();
    expect(config.secretKey).toBeUndefined();
  });

  it('reads the test keys in test mode and ignores live keys', () => {
    process.env.STRIPE_TEST_PUBLISHABLE_KEY = 'pk_test_abc';
    process.env.STRIPE_TEST_SECRET_KEY = 'sk_test_abc';
    process.env.STRIPE_LIVE_PUBLISHABLE_KEY = 'pk_live_abc';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_abc';
    const config = load();
    expect(config.publishableKey).toBe('pk_test_abc');
    expect(config.secretKey).toBe('sk_test_abc');
  });

  it('falls back to the unprefixed keys in test mode only', () => {
    process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_plain';
    process.env.STRIPE_SECRET_KEY = 'sk_test_plain';
    let config = load();
    expect(config.publishableKey).toBe('pk_test_plain');
    expect(config.secretKey).toBe('sk_test_plain');

    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }), { virtual: true });
    process.env.STRIPE_MODE = 'live';
    config = load();
    expect(config.mode).toBe('live');
    expect(config.publishableKey).toBeUndefined();
    expect(config.secretKey).toBeUndefined();
  });

  it('reads the live keys and live price in live mode', () => {
    process.env.STRIPE_MODE = 'live';
    process.env.STRIPE_LIVE_PUBLISHABLE_KEY = 'pk_live_abc';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_abc';
    process.env.STRIPE_LIVE_PRICE_ID = 'price_custom_live';
    process.env.STRIPE_TEST_PRICE_ID = 'price_custom_test';
    const config = load();
    expect(config).toEqual({
      publishableKey: 'pk_live_abc',
      secretKey: 'sk_live_abc',
      priceId: 'price_custom_live',
      mode: 'live',
    });
  });

  it('uses the default live price when none is set', () => {
    process.env.STRIPE_MODE = 'live';
    expect(load().priceId).toBe(LIVE_PRICE_DEFAULT);
  });

  it('falls back to test mode for an invalid STRIPE_MODE', () => {
    process.env.STRIPE_MODE = 'production';
    process.env.STRIPE_LIVE_SECRET_KEY = 'sk_live_abc';
    const config = load();
    expect(config.mode).toBe('test');
    expect(config.secretKey).toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid STRIPE_MODE'));
  });

  it('drops a publishable key that does not start with pk_', () => {
    process.env.STRIPE_TEST_PUBLISHABLE_KEY = 'sk_test_wrong_place';
    const config = load();
    expect(config.publishableKey).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Stripe publishable key is invalid.');
  });

  it.each(['sk_test_abc', 'rk_test_abc'])('keeps the server key %s', (secret) => {
    process.env.STRIPE_TEST_SECRET_KEY = secret;
    expect(load().secretKey).toBe(secret);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('drops a server key that is neither sk_ nor rk_', () => {
    process.env.STRIPE_TEST_SECRET_KEY = 'pk_test_wrong_place';
    const config = load();
    expect(config.secretKey).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Stripe server key is invalid.');
  });
});

describe('lib/stripeConfig.js (client)', () => {
  const loadWithExtra = (extra) => {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { expoConfig: { extra } },
    }), { virtual: true });
    return require('./stripeConfig');
  };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.dontMock('expo-constants');
  });

  it('defaults to test mode with the test price and warns about the missing key', () => {
    const config = loadWithExtra({});
    expect(config.mode).toBe('test');
    expect(config.priceId).toBe(TEST_PRICE_DEFAULT);
    expect(config.publishableKey).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith('Stripe publishable key not set for test mode');
  });

  it('uses the live publishable key and live price in live mode', () => {
    const config = loadWithExtra({
      STRIPE_MODE: 'live',
      STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_abc',
      STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_abc',
    });
    expect(config).toEqual({
      publishableKey: 'pk_live_abc',
      priceId: LIVE_PRICE_DEFAULT,
      mode: 'live',
    });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('never exposes a secret key to the client bundle', () => {
    const config = loadWithExtra({
      STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_abc',
      STRIPE_SECRET_KEY: 'sk_test_abc',
      STRIPE_TEST_SECRET_KEY: 'sk_test_abc',
    });
    expect(config).not.toHaveProperty('secretKey');
    expect(JSON.stringify(config)).not.toContain('sk_test');
  });
});
