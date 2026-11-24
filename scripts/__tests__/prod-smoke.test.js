const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

test('the production smoke serves only known analytics scripts locally', () => {
  const smokeUrl = pathToFileURL(path.resolve(__dirname, '../prod-smoke.mjs')).href;
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { isolateRequest } from ${JSON.stringify(smokeUrl)};

    const origin = 'https://safedose.example';

    async function disposition(url, method = 'GET', resourceType = 'script') {
      return isolateRequest({
        request: () => ({
          url: () => url,
          method: () => method,
          resourceType: () => resourceType,
          allHeaders: async () => ({}),
        }),
        fulfill: async (response) => response,
        continue: async () => 'live',
        abort: async () => 'blocked',
      }, origin);
    }

    const inert = { contentType: 'application/javascript', body: '' };
    assert.deepEqual(await disposition(origin + '/_vercel/insights/script.js'), inert);
    assert.deepEqual(await disposition('https://www.googletagmanager.com/gtag/js?id=fixture'), inert);
    assert.equal(await disposition(origin + '/_vercel/insights/event', 'POST', 'fetch'), 'blocked');
    assert.equal(await disposition('https://www.googletagmanager.com/td', 'GET', 'image'), 'blocked');
    assert.equal(await disposition(origin + '/_expo/app.js'), 'live');
  `]);
});
