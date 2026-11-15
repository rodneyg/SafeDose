const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const script = path.resolve(__dirname, '../check-bundle-secrets.js');

describe('client secret CI guard', () => {
  let cwd;
  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'saf110-guard-'));
    fs.mkdirSync(path.join(cwd, 'dist'));
    fs.writeFileSync(path.join(cwd, 'app.config.js'), 'module.exports = { extra: {} };');
  });
  afterEach(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const run = cwd => spawnSync(process.execPath, [script], {
    cwd, encoding: 'utf8', env: { ...process.env, OPENAI_API_KEY: 'synthetic-private-value' },
  });

  it.each(['sk-', 'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', 'rk_test_'])(
    'rejects a synthetic %s credential without logging it', prefix => {
      const secret = prefix + 'syntheticCredential123456';
      fs.writeFileSync(path.join(cwd, 'dist', 'bundle.js'), JSON.stringify(secret));
      const result = run(cwd);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('dist/bundle.js');
      expect(result.stdout + result.stderr).not.toContain(secret);
    },
  );
  it('rejects the exact server key even without a recognized prefix', () => {
    fs.writeFileSync(path.join(cwd, 'dist', 'bundle.js'), 'synthetic-private-value');
    expect(run(cwd).status).toBe(1);
  });
  it('rejects secrets in resolved config extra', () => {
    fs.writeFileSync(path.join(cwd, 'app.config.js'),
      'module.exports = { extra: { nested: { key: process.env.OPENAI_API_KEY } } };');
    const result = run(cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('app.config.js extra');
    expect(result.stderr).not.toContain('synthetic-private-value');
  });
  it('allows public keys and server-only config values', () => {
    fs.writeFileSync(path.join(cwd, 'app.config.js'),
      'module.exports = { serverOnly: process.env.OPENAI_API_KEY, extra: { key: "pk_test_public" } };');
    expect(run(cwd).status).toBe(0);
  });
  it('fails when the web export is missing', () => {
    fs.rmSync(path.join(cwd, 'dist'), { recursive: true });
    expect(run(cwd).status).toBe(2);
  });
});
