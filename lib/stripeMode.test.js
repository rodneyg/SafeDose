const { resolveStripeMode, DEFAULT_STRIPE_MODE, VALID_STRIPE_MODES } = require('./stripeMode');

function mockLogger() {
  return { error: jest.fn() };
}

describe('resolveStripeMode', () => {
  it('uses test mode by default', () => {
    expect(DEFAULT_STRIPE_MODE).toBe('test');
    expect(VALID_STRIPE_MODES).toEqual(['test', 'live']);
  });

  it('selects live mode when asked for live', () => {
    const logger = mockLogger();
    expect(resolveStripeMode('live', logger)).toBe('live');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('selects test mode when asked for test', () => {
    const logger = mockLogger();
    expect(resolveStripeMode('test', logger)).toBe('test');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([undefined, null, ''])('falls back to test without an error when the mode is %p', (rawMode) => {
    const logger = mockLogger();
    expect(resolveStripeMode(rawMode, logger)).toBe('test');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each(['production', 'LIVE', 'Test', ' live', 'sandbox'])('falls back to test and logs an error for invalid mode %p', (rawMode) => {
    const logger = mockLogger();
    expect(resolveStripeMode(rawMode, logger)).toBe('test');
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      `Invalid STRIPE_MODE: ${rawMode}. Must be 'test' or 'live'. Defaulting to 'test'.`
    );
  });

  it('logs to console.error when no logger is passed', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(resolveStripeMode('staging')).toBe('test');
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});

// The config files read env at import time. These tests only use fake values
// and stub dotenv so no real .env file or Stripe key is ever loaded.
describe('Stripe configs use the shared mode helper', () => {
  const ORIGINAL_ENV = process.env;
  const STRIPE_ENV_KEYS = Object.keys(process.env).filter((key) => key.startsWith('STRIPE_'));

  function fakeServerEnv(mode) {
    const env = { ...ORIGINAL_ENV };
    STRIPE_ENV_KEYS.forEach((key) => delete env[key]);
    if (mode !== undefined) env.STRIPE_MODE = mode;
    env.STRIPE_TEST_PUBLISHABLE_KEY = 'pk_test_fake';
    env.STRIPE_TEST_SECRET_KEY = 'sk_test_fake';
    env.STRIPE_LIVE_PUBLISHABLE_KEY = 'pk_live_fake';
    env.STRIPE_LIVE_SECRET_KEY = 'sk_live_fake';
    return env;
  }

  function loadServerConfig(mode) {
    process.env = fakeServerEnv(mode);
    let config;
    jest.isolateModules(() => {
      jest.doMock('dotenv', () => ({ config: jest.fn() }));
      config = require('./stripeConfig.server');
    });
    return config;
  }

  function loadClientConfig(mode) {
    const extra = {
      STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_fake',
      STRIPE_LIVE_PUBLISHABLE_KEY: 'pk_live_fake',
    };
    if (mode !== undefined) extra.STRIPE_MODE = mode;
    let config;
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra } } }));
      config = require('./stripeConfig');
    });
    return config;
  }

  let errorSpy;
  let warnSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    jest.dontMock('dotenv');
    jest.dontMock('expo-constants');
  });

  it.each([
    ['live', 'live', 'pk_live_fake', 'sk_live_fake'],
    ['test', 'test', 'pk_test_fake', 'sk_test_fake'],
    [undefined, 'test', 'pk_test_fake', 'sk_test_fake'],
    ['bogus', 'test', 'pk_test_fake', 'sk_test_fake'],
  ])('server config with STRIPE_MODE=%p uses %s keys', (rawMode, mode, publishableKey, secretKey) => {
    const config = loadServerConfig(rawMode);
    expect(config.mode).toBe(mode);
    expect(config.publishableKey).toBe(publishableKey);
    expect(config.secretKey).toBe(secretKey);
    expect(errorSpy).toHaveBeenCalledTimes(rawMode === 'bogus' ? 1 : 0);
  });

  it.each([
    ['live', 'live', 'pk_live_fake'],
    ['test', 'test', 'pk_test_fake'],
    [undefined, 'test', 'pk_test_fake'],
    ['bogus', 'test', 'pk_test_fake'],
  ])('client config with STRIPE_MODE=%p uses %s keys', (rawMode, mode, publishableKey) => {
    const config = loadClientConfig(rawMode);
    expect(config.mode).toBe(mode);
    expect(config.publishableKey).toBe(publishableKey);
    expect(config).not.toHaveProperty('secretKey');
    expect(errorSpy).toHaveBeenCalledTimes(rawMode === 'bogus' ? 1 : 0);
  });
});
