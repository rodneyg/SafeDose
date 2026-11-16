/* eslint-env node, jest */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { generateServiceWorker } = require('../generate-service-worker');

describe('production service worker', () => {
  let directory;
  let handlers;
  let cache;
  let caches;
  let network;
  function generate() {
    generateServiceWorker(directory);
    return fs.readFileSync(path.join(directory, 'sw.js'), 'utf8');
  }
  function load() {
    handlers = {};
    cache = { addAll: jest.fn().mockResolvedValue(), match: jest.fn().mockResolvedValue('static response') };
    caches = {
      open: jest.fn().mockResolvedValue(cache),
      keys: jest.fn().mockResolvedValue(['safedose-static-old', 'other-app']),
      delete: jest.fn().mockResolvedValue(true),
    };
    network = jest.fn().mockRejectedValue(new Error('offline'));
    vm.runInNewContext(generate(), {
      self: { location: { origin: 'https://example.com' }, clients: { claim: jest.fn() },
        addEventListener: (name, handler) => { handlers[name] = handler; } },
      caches, fetch: network, URL, Set,
    });
  }
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'saf125-'));
    for (const file of ['index.html', 'new-dose.html', 'manifest.webmanifest', 'app.js', 'app.js.map']) {
      fs.writeFileSync(path.join(directory, file), file);
    }
    fs.mkdirSync(path.join(directory, 'onboarding'));
    fs.writeFileSync(path.join(directory, 'onboarding/index.html'), 'onboarding');
    load();
  });
  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  test('build identity is deterministic and changes when content changes', () => {
    const original = generate();
    expect(generate()).toBe(original);
    fs.writeFileSync(path.join(directory, 'app.js'), 'new build');
    expect(generate()).not.toBe(original);
    expect(original).not.toContain('app.js.map');
  });
  test('missing export fails instead of shipping an empty cache', () => {
    fs.unlinkSync(path.join(directory, 'index.html'));
    expect(generate).toThrow('Export the web app');
  });
  test('install precaches static files and propagates quota/network failure', async () => {
    const waitUntil = jest.fn();
    handlers.install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(cache.addAll).toHaveBeenCalledWith(expect.arrayContaining(['/index.html', '/app.js']));
    cache.addAll.mockRejectedValueOnce(new Error('quota'));
    handlers.install({ waitUntil });
    await expect(waitUntil.mock.calls[1][0]).rejects.toThrow('quota');
  });
  test('activation only removes old SafeDose caches', async () => {
    const waitUntil = jest.fn();
    handlers.activate({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(caches.delete).toHaveBeenCalledTimes(1);
    expect(caches.delete).toHaveBeenCalledWith('safedose-static-old');
  });
  test.each(['/', '/new-dose', '/new-dose/', '/new-dose.html', '/new-dose?token=private'])('offline navigation: %s', async (route) => {
    const respondWith = jest.fn();
    handlers.fetch({ request: { url: `https://example.com${route}`, method: 'GET', mode: 'navigate' }, respondWith });
    expect(await respondWith.mock.calls[0][0]).toBe('static response');
    expect(cache.match).toHaveBeenCalledWith(route === '/' ? '/index.html' : '/new-dose.html');
    expect(network).not.toHaveBeenCalled();
  });
  test.each([
    ['https://example.com/api/analyze-scan', 'POST', 'cors'],
    ['https://example.com/api/profile', 'GET', 'navigate'],
    ['https://example.com/__/auth/handler', 'GET', 'navigate'],
    ['https://external.com/app.js', 'GET', 'cors'],
    ['https://example.com/unknown', 'GET', 'navigate'],
    ['https://example.com/app.js?private=1', 'GET', 'cors'],
  ])('does not intercept private or unknown request %s', (url, method, mode) => {
    const respondWith = jest.fn();
    handlers.fetch({ request: { url, method, mode }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  test('static assets load from the offline cache', async () => {
    const respondWith = jest.fn();
    handlers.fetch({ request: { url: 'https://example.com/app.js', method: 'GET', mode: 'cors' }, respondWith });
    expect(await respondWith.mock.calls[0][0]).toBe('static response');
  });
  test('directory index routes work offline', async () => {
    const respondWith = jest.fn();
    handlers.fetch({ request: { url: 'https://example.com/onboarding', method: 'GET', mode: 'navigate' }, respondWith });
    expect(await respondWith.mock.calls[0][0]).toBe('static response');
    expect(cache.match).toHaveBeenCalledWith('/onboarding/index.html');
  });
});
