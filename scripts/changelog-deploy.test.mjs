import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { deployCommitMessage, pendingChangelog } from './changelog-deploy.mjs';

const RUNTIME = 'lib/scan.ts';
const CHANGELOG = ['changelog/2026-11-21-pr-1.md', 'lib/changelog.json'];
const script = resolve('scripts/changelog-deploy.mjs');
const T0 = 1_800_000_000;

function repo() {
  mkdirSync('.verify', { recursive: true });
  const cwd = mkdtempSync(resolve('.verify/changelog-deploy-'));
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  let tick = T0;
  const commit = (paths, message, at = (tick += 60)) => {
    for (const path of [].concat(paths)) {
      mkdirSync(dirname(resolve(cwd, path)), { recursive: true });
      writeFileSync(resolve(cwd, path), `${message} ${at}`);
      git('add', '--', path);
    }
    execFileSync('git', ['commit', ...([].concat(paths).length ? [] : ['--allow-empty']), '-m', message], {
      cwd, stdio: 'ignore',
      env: { ...process.env, GIT_AUTHOR_DATE: `${at} +0000`, GIT_COMMITTER_DATE: `${at} +0000` },
    });
    return at;
  };
  return { cwd, git, commit };
}
const minutes = (n) => n * 60;

test('nothing pending right after a runtime commit', () => {
  const r = repo();
  const at = r.commit(RUNTIME, 'runtime');
  assert.equal(pendingChangelog({ cwd: r.cwd, now: at + minutes(120) }).deploy, false);
});
test('pending entries wait for the quiet period, then become one deploy', () => {
  const r = repo();
  r.commit(RUNTIME, 'runtime');
  r.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  const last = r.commit(CHANGELOG, 'docs: publish changelog for PR #2');
  const early = pendingChangelog({ cwd: r.cwd, now: last + minutes(5), quietMinutes: 15 });
  assert.equal(early.deploy, false);
  assert.equal(early.pending.length, 2);
  const late = pendingChangelog({ cwd: r.cwd, now: last + minutes(16), quietMinutes: 15 });
  assert.equal(late.deploy, true);
  assert.equal(late.pending.length, 2);
  assert.equal(deployCommitMessage(late.pending), 'deploy: publish 2 pending changelog entries');
});
test('a steady stream of skipped commits still deploys once the oldest entry is too old', () => {
  const r = repo();
  r.commit(RUNTIME, 'runtime');
  const first = r.commit(CHANGELOG, 'docs: publish changelog for PR #1', T0 + minutes(10));
  r.commit('tests/a.test.ts', 'test: a', T0 + minutes(40));
  const last = r.commit('tests/b.test.ts', 'test: b', T0 + minutes(69));
  const now = last + minutes(2);
  assert.ok(now - first >= minutes(60));
  const result = pendingChangelog({ cwd: r.cwd, now, quietMinutes: 15, maxMinutes: 60 });
  assert.equal(result.deploy, true);
  assert.equal(result.reason, 'oldest pending entry too old');
});
test('a runtime commit after pending entries clears them, it will deploy them itself', () => {
  const r = repo();
  r.commit(RUNTIME, 'runtime');
  r.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  const at = r.commit(RUNTIME, 'runtime again');
  assert.equal(pendingChangelog({ cwd: r.cwd, now: at + minutes(120) }).deploy, false);
});
test('a deploy commit resets pending entries and the flush is idempotent', () => {
  const r = repo();
  r.commit(RUNTIME, 'runtime');
  r.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  const at = r.commit([], 'deploy: publish 1 pending changelog entry');
  assert.equal(pendingChangelog({ cwd: r.cwd, now: at + minutes(120) }).deploy, false);
});
test('without a build boundary in the window nothing is deployed', () => {
  const r = repo();
  const at = r.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  assert.equal(pendingChangelog({ cwd: r.cwd, now: at + minutes(120) }).deploy, false);
});
test('CLI without --push never commits', () => {
  const r = repo();
  r.commit(RUNTIME, 'runtime');
  r.commit(CHANGELOG, 'docs: publish changelog for PR #1');
  const before = r.git('rev-parse', 'HEAD');
  const out = spawnSync(process.execPath, [script], { cwd: r.cwd, encoding: 'utf8' });
  assert.equal(out.status, 0);
  assert.equal(r.git('rev-parse', 'HEAD'), before);
});
