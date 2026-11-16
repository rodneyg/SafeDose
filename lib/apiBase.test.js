const { getApiBaseUrl, PRODUCTION_API_BASE_URL } = require('./apiBase');

describe('getApiBaseUrl', () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete global.window;
    } else {
      global.window = originalWindow;
    }
  });

  it('uses the current origin on web previews', () => {
    global.window = { location: { origin: 'https://safe-dose-abc123-rodneygs-projects.vercel.app' } };
    expect(getApiBaseUrl()).toBe('https://safe-dose-abc123-rodneygs-projects.vercel.app');
  });

  it('falls back to production when window is unavailable', () => {
    delete global.window;
    expect(getApiBaseUrl()).toBe(PRODUCTION_API_BASE_URL);
  });
});
