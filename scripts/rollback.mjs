#!/usr/bin/env node
/**
 * Promote the Vercel production deployment for a released tag.
 * Usage: npm run rollback -- v1.0.0
 *        npm run rollback -- v1.0.0 --dry-run
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

// npm scripts put node_modules/.bin first. SafeDose depends on an old vercel
// package, so prefer a current CLI from the system PATH.
function vercelBin() {
  if (process.env.VERCEL_BIN) return process.env.VERCEL_BIN;
  const entries = (process.env.PATH || '').split(delimiter);
  for (const dir of entries) {
    if (dir.includes(`${join('node_modules', '.bin')}`)) continue;
    const candidate = join(dir, 'vercel');
    if (existsSync(candidate)) return candidate;
  }
  return 'vercel';
}

const VERCEL = vercelBin();

const PROJECT = process.env.VERCEL_PROJECT || 'safe-dose';
const SCOPE = process.env.VERCEL_SCOPE || 'rodneygs-projects';
const PROD_URL = 'https://safedose.rodneygainous.com';

function parseArgs(argv) {
  const args = argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tag = args.find((item) => item !== '--dry-run');
  return { dryRun, tag };
}

function run(cmd, extra = {}) {
  return execFileSync(cmd[0], cmd.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...extra,
  }).trim();
}

function resolveSha(tag) {
  try {
    return run(['git', 'rev-list', '-n', '1', tag]);
  } catch {
    throw new Error(`Could not resolve tag ${tag} to a commit. Fetch tags with git fetch --tags.`);
  }
}

function listDeployments() {
  const raw = run([VERCEL, 'ls', PROJECT, '--scope', SCOPE, '--json']);
  const data = JSON.parse(raw);
  return data.deployments || [];
}

function findProduction(deployments, sha) {
  const matches = deployments.filter((item) => {
    const commit = item.meta && item.meta.githubCommitSha;
    return commit === sha && item.target === 'production' && item.state === 'READY';
  });
  matches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return matches[0] || null;
}

function deploymentUrl(item) {
  const host = item.url.startsWith('http') ? item.url : `https://${item.url}`;
  return host;
}

function promote(url, dryRun) {
  const cmd = [VERCEL, 'promote', url, '--scope', SCOPE, '--yes'];
  if (dryRun) {
    console.log('Dry run. Would promote:', cmd.join(' '));
    return;
  }
  const result = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (output) process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
  if (result.status === 0) return;
  if (/already the current production deployment/i.test(output)) {
    console.log('That deployment is already current production. Nothing to change.');
    return;
  }
  throw new Error(`vercel promote failed with exit ${result.status}`);
}

function redeployTag(sha, dryRun) {
  const projectId = process.env.VERCEL_PROJECT_ID;
  const orgId = process.env.VERCEL_ORG_ID;
  if (!projectId || !orgId) {
    throw new Error('Fallback redeploy requires VERCEL_PROJECT_ID and VERCEL_ORG_ID to target the safe-dose project.');
  }
  const cmd = [
    VERCEL, 'deploy', '--prod', '--yes', '--project', projectId, '--scope', orgId,
    '--force',
  ];
  if (dryRun) {
    console.log(`Dry run. No production deployment found for ${sha}.`);
    console.log('Would check out that commit and run:', cmd.join(' '));
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), 'safedose-rollback-'));
  run(['git', 'worktree', 'add', '--detach', dir, sha]);
  try {
    const result = spawnSync(cmd[0], cmd.slice(1), { cwd: dir, stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`vercel deploy --prod failed with exit ${result.status}`);
    }
  } finally {
    try {
      run(['git', 'worktree', 'remove', '--force', dir]);
    } catch {
      // Best effort cleanup.
    }
  }
}

function main() {
  const { dryRun, tag } = parseArgs(process.argv);
  if (!tag) {
    console.error('Usage: npm run rollback -- vX.Y.Z [--dry-run]');
    process.exit(2);
  }
  const sha = resolveSha(tag);
  console.log(`Resolved ${tag} to ${sha}`);
  const deployments = listDeployments();
  const found = findProduction(deployments, sha);
  if (found) {
    const url = deploymentUrl(found);
    console.log(`Found production deployment ${url} (${found.state})`);
    promote(url, dryRun);
  } else {
    redeployTag(sha, dryRun);
  }
  if (!dryRun) {
    console.log(`Production URL to confirm: ${PROD_URL}`);
  }
}

main();
