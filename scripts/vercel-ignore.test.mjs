import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import test from 'node:test';
import { ignoreBuild, isPreviewOnly } from './vercel-ignore.mjs';

const script = resolve('scripts/vercel-ignore.mjs');
test('classifies docs, tests, CI and evaluation fixtures', () => {
  for (const path of ['README.md', 'notes.markdown', 'docs/evidence.png',
    'lib/dose.test.ts', 'components/scan.spec.tsx', 'api/__tests__/scan.js',
    'tests/fixture.json', 'lib/__fixtures__/dose.json', '.github/workflows/ci.yml',
    '.github/actions/check/action.yml', 'jest.config.js', 'jest.setup.ts',
    'evals/test-sets/dose.json', 'evals/vision/fixtures/model-outputs.json',
    'evals/vision/labels/synthetic-v1/example.json']) {
    assert.equal(isPreviewOnly(path), true, path);
  }
});
test('runtime, dependencies, deployment config and published Markdown build', () => {
  for (const path of ['app/index.tsx', 'api/analyze.js', 'lib/scan.ts',
    'package.json', 'package-lock.json', 'vercel.json', 'scripts/vercel-ignore.mjs',
    'scripts/build.js', 'assets/icon.png', 'public/guide.md', 'assets/help.md',
    'changelog/release.md', 'lib/changelog.json', 'evals/vision/harness.ts',
    'evals/vision/thresholds.json', 'unknown.json', 'tsconfig.json']) {
    assert.equal(isPreviewOnly(path), false, path);
  }
});
test('production, main and unknown environments always build', () => {
  for (const env of [{}, { VERCEL_ENV: 'production' }, { VERCEL_ENV: 'development' },
    { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'main' },
    { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'refs/heads/main' },
    { VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'production' }]) {
    assert.equal(ignoreBuild({ env, cwd: '/unavailable' }), 1);
  }
});

// Retain all fixtures in ignored .verify/; this suite never deletes files.
function fixture() {
  mkdirSync('.verify', { recursive: true });
  const cwd = mkdtempSync(resolve('.verify/vercel-ignore-'));
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'SafeDose test');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  const commit = (path, text = 'fixture') => {
    mkdirSync(dirname(resolve(cwd, path)), { recursive: true });
    writeFileSync(resolve(cwd, path), text);
    git('add', '--', path);
    git('commit', '-m', 'fixture');
  };
  commit('README.md');
  git('remote', 'add', 'origin', cwd);
  git('switch', '-c', 'preview');
  const run = (extra = {}) => spawnSync(process.execPath, [script], {
    cwd, env: { ...process.env, VERCEL_ENV: 'preview',
      VERCEL_TARGET_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'preview', ...extra },
    encoding: 'utf8',
  }).status;
  return { cwd, git, commit, run };
}
test('CLI skips full multi-commit non-runtime diff', () => {
  const f = fixture();
  for (const path of ['docs/setup.md', 'lib/dose.test.ts', '.github/workflows/ci.yml',
    'evals/vision/fixtures/model-outputs.json']) f.commit(path);
  assert.equal(f.run(), 0);
  assert.equal(f.run({ VERCEL_ENV: 'production' }), 1);
  assert.equal(f.run({ VERCEL_GIT_COMMIT_REF: 'main' }), 1);
});
test('CLI builds earlier app changes followed by docs-only tip', () => {
  const f = fixture();
  f.commit('app/index.tsx');
  f.commit('docs/setup.md');
  assert.equal(f.run(), 1);
});
test('CLI builds published changelog Markdown', () => {
  const f = fixture();
  f.commit('changelog/release.md');
  assert.equal(f.run(), 1);
});
test('rename or deletion of app input cannot hide in docs', () => {
  const f = fixture();
  f.commit('app/index.tsx');
  f.git('branch', '-f', 'main', 'HEAD');
  const blob = f.git('rev-parse', 'HEAD:app/index.tsx');
  f.git('update-index', '--force-remove', 'app/index.tsx');
  f.git('update-index', '--add', '--cacheinfo', `100644,${blob},docs/index.md`);
  f.git('commit', '-m', 'rename fixture');
  assert.equal(f.run(), 1);
});
test('empty diff, missing origin and missing ancestry all build', () => {
  const f = fixture();
  assert.equal(f.run(), 1);
  f.commit('docs/setup.md');
  const root = f.git('commit-tree', 'HEAD^{tree}', '-m', 'unrelated root');
  f.git('branch', '-f', 'main', root);
  assert.equal(f.run(), 1);
  f.git('remote', 'set-url', 'origin', resolve(f.cwd, 'missing-origin'));
  assert.equal(f.run(), 1);
});
test('command is wired into Vercel configuration', async () => {
  const { readFileSync } = await import('node:fs');
  assert.equal(JSON.parse(readFileSync('vercel.json', 'utf8')).ignoreCommand,
    'node scripts/vercel-ignore.mjs');
});

// Production builds: skip only when everything since the last successful
// production deployment is non-runtime or pending changelog files.
const RUNTIME = 'lib/scan.ts';
const CHANGELOG = ['changelog/2026-11-21-pr-1.md', 'lib/changelog.json'];
function prodFixture() {
  mkdirSync('.verify', { recursive: true });
  const cwd = mkdtempSync(resolve('.verify/vercel-ignore-prod-'));
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  const commit = (paths, message = 'fixture') => {
    for (const path of [].concat(paths)) {
      mkdirSync(dirname(resolve(cwd, path)), { recursive: true });
      writeFileSync(resolve(cwd, path), `${message} ${Math.random()}`);
      git('add', '--', path);
    }
    git('commit', '-m', message);
    return git('rev-parse', 'HEAD');
  };
  const base = commit(RUNTIME, 'deployed runtime');
  const run = (extra = {}) => spawnSync(process.execPath, [script], {
    cwd, env: { ...process.env, VERCEL_ENV: 'production', VERCEL_TARGET_ENV: 'production',
      VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_PREVIOUS_SHA: base,
      VERCEL_GIT_COMMIT_MESSAGE: 'fixture', ...extra },
    encoding: 'utf8',
  }).status;
  return { cwd, git, commit, run, base };
}
test('production skips test-only, docs-only and pending changelog commits since the last deployment', () => {
  const f = prodFixture();
  f.commit('tests/new-behavior.test.ts', 'test: cover behavior (#1)');
  f.commit('docs/notes.md', 'docs: notes');
  f.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  assert.equal(f.run(), 0);
});
test('production builds when any runtime file changed since the last deployment', () => {
  const f = prodFixture();
  f.commit(RUNTIME, 'fix: runtime');
  f.commit(CHANGELOG, 'docs: publish changelog for PR #2');
  assert.equal(f.run(), 1);
});
test('production builds an earlier runtime change hidden under a test-only tip', () => {
  const f = prodFixture();
  f.commit(RUNTIME, 'fix: runtime');
  f.commit('tests/after.test.ts', 'test: after');
  assert.equal(f.run(), 1);
});
test('production deploy commit always builds, so pending changelog entries ship', () => {
  const f = prodFixture();
  f.commit(CHANGELOG, 'docs: publish changelog for PR #3');
  assert.equal(f.run(), 0);
  f.git('commit', '--allow-empty', '-m', 'deploy: publish 1 pending changelog entry');
  assert.equal(f.run({ VERCEL_GIT_COMMIT_MESSAGE: 'deploy: publish 1 pending changelog entry' }), 1);
});
test('production builds on unknown ancestry, missing previous deployment or empty diff', () => {
  const f = prodFixture();
  f.commit('tests/x.test.ts', 'test: x');
  assert.equal(f.run({ VERCEL_GIT_PREVIOUS_SHA: '' }), 1);
  assert.equal(f.run({ VERCEL_GIT_PREVIOUS_SHA: 'not-a-sha' }), 1);
  assert.equal(f.run({ VERCEL_GIT_PREVIOUS_SHA: '0'.repeat(40) }), 1);
  assert.equal(f.run({ VERCEL_GIT_PREVIOUS_SHA: f.git('rev-parse', 'HEAD') }), 1);
});
test('production config and ignore script changes always build', () => {
  for (const path of ['vercel.json', 'package.json', 'scripts/vercel-ignore.mjs']) {
    const f = prodFixture();
    f.commit(path, `change ${path}`);
    assert.equal(f.run(), 1, path);
  }
});
test('production skip applies only to main, previews keep their own rule', () => {
  const f = prodFixture();
  f.commit('tests/y.test.ts', 'test: y');
  assert.equal(f.run({ VERCEL_GIT_COMMIT_REF: 'feature' }), 1);
});
