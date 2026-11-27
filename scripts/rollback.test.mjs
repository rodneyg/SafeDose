import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const rollbackScript = new URL('./rollback.mjs', import.meta.url);

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'safedose-rollback-test-'));
  t.after(() => {
    spawnSync('git', ['worktree', 'prune'], { cwd: root, stdio: 'ignore' });
    // The test runs in an isolated disposable repository under TMPDIR.
    rmSync(root, { recursive: true, force: true });
  });
  const repo = join(root, 'repo');
  mkdirSync(repo);
  const git = (args) => {
    const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(['init', '-q']);
  git(['config', 'user.email', 'rollback-test@example.invalid']);
  git(['config', 'user.name', 'Rollback test']);
  writeFileSync(join(repo, 'README.md'), 'fixture\n');
  git(['add', 'README.md']);
  git(['commit', '-qm', 'fixture']);
  git(['tag', 'v1.2.3']);

  const callsPath = join(root, 'vercel-calls.jsonl');
  const stub = join(root, 'vercel-stub');
  writeFileSync(stub, `#!/usr/bin/env node\nconst fs = require('node:fs');\nconst call = { args: process.argv.slice(2), cwd: process.cwd() };\nfs.appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify(call) + '\\n');\nif (call.args[0] === 'ls') process.stdout.write(JSON.stringify({ deployments: [] }));\n`);
  chmodSync(stub, 0o755);
  return { root, repo, callsPath, stub };
}

function runRollback(fixture, extraEnv = {}) {
  return spawnSync(process.execPath, [rollbackScript.pathname, 'v1.2.3', '--dry-run'], {
    cwd: fixture.repo,
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL_BIN: fixture.stub,
      VERCEL_PROJECT_ID: 'prj_safe_dose_fixture',
      VERCEL_ORG_ID: 'team_safe_dose_fixture',
      ...extraEnv,
    },
  });
}

function calls(fixture) {
  return readFileSync(fixture.callsPath, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

test('fallback dry run explicitly targets the SafeDose project and organization', (t) => {
  const fixture = setup(t);
  const result = runRollback(fixture);
  assert.equal(result.status, 0, result.stderr);

  assert.match(result.stdout, /Would check out that commit and run: .*deploy --prod --yes --project prj_safe_dose_fixture --scope team_safe_dose_fixture --force/);
  assert.equal(calls(fixture).some((call) => call.args[0] === 'deploy'), false, 'dry run must not deploy');
});

test('fallback refuses to deploy without explicit project and organization IDs', (t) => {
  const fixture = setup(t);
  const result = runRollback(fixture, { VERCEL_PROJECT_ID: '', VERCEL_ORG_ID: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Fallback redeploy requires VERCEL_PROJECT_ID and VERCEL_ORG_ID/);
  assert.equal(calls(fixture).some((call) => call.args[0] === 'deploy'), false, 'dry run must not deploy');
});
