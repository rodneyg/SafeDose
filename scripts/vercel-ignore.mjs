import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Keep build inputs, including the published changelog, eligible for previews.
export function isPreviewOnly(path) {
  if (/^(changelog|public|assets)\//.test(path)) return false;
  return /\.(md|mdx|markdown)$/i.test(path) ||
    /^docs\//.test(path) ||
    /(^|\/)(__tests__|tests|__mocks__|__fixtures__)\//.test(path) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/.test(path) ||
    /^\.github\/(workflows|actions)\//.test(path) ||
    /^(jest\.config\.[cm]?js|jest\.setup\.[jt]s|tsconfig\.(dosing|vision)\.json)$/.test(path) ||
    /^evals\/(test-sets|vision\/(fixtures|labels|images))\//.test(path);
}

// Files that only publish the changelog. They must reach production, but a
// separate deploy commit (scripts/changelog-deploy.mjs) batches that delivery,
// so a bot commit that touches only these files does not start its own build.
export function isChangelogPublished(path) {
  return /^(changelog\/|lib\/changelog\.json$)/.test(path);
}

// A production build is redundant when everything since the last successful
// production deployment is tests, docs, CI config or pending changelog files.
export function isDeployExempt(path) {
  return isPreviewOnly(path) || isChangelogPublished(path);
}

export const DEPLOY_COMMIT = /^deploy:/i;

export function ignoreProduction({ env = process.env, cwd = process.cwd() } = {}) {
  // An explicit deploy commit always builds, so published changelog entries ship.
  if (DEPLOY_COMMIT.test(env.VERCEL_GIT_COMMIT_MESSAGE || '')) return 1;
  const previous = env.VERCEL_GIT_PREVIOUS_SHA || '';
  // Without a known successful production deployment, always build.
  if (!/^[0-9a-f]{40}$/i.test(previous)) return 1;
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000,
  });
  try {
    try { git('cat-file', '-e', `${previous}^{commit}`); }
    catch { git('fetch', '--quiet', '--depth=1', 'origin', previous); }
    // Tree diff from the last good deployment to this commit covers every
    // commit in between, including ones whose own builds were skipped.
    const paths = git('diff', '--name-only', '--no-renames', '-z', previous, 'HEAD', '--')
      .split('\0').filter(Boolean);
    return paths.length > 0 && paths.every(isDeployExempt) ? 0 : 1;
  } catch {
    return 1;
  }
}

export function ignoreBuild({ env = process.env, cwd = process.cwd() } = {}) {
  if (env.VERCEL_ENV === 'production' &&
      ['main', 'refs/heads/main'].includes(env.VERCEL_GIT_COMMIT_REF)) {
    return ignoreProduction({ env, cwd });
  }
  if (env.VERCEL_ENV !== 'preview' || env.VERCEL_TARGET_ENV === 'production' ||
      ['main', 'refs/heads/main'].includes(env.VERCEL_GIT_COMMIT_REF)) return 1;
  const git = (...args) => execFileSync('git', args, {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000,
  });
  try {
    // Full branch diff prevents a docs-only tip hiding an earlier app change.
    // Missing shallow ancestry or a failed fetch must allow the build.
    git('fetch', '--quiet', '--depth=100', 'origin', 'main');
    const base = git('merge-base', 'HEAD', 'FETCH_HEAD').trim();
    // Inspect both sides of renames, including deletions of runtime inputs.
    const paths = git('diff', '--name-only', '--no-renames', '-z', base, 'HEAD', '--')
      .split('\0').filter(Boolean);
    return paths.length > 0 && paths.every(isPreviewOnly) ? 0 : 1;
  } catch {
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = ignoreBuild();
  console.log(result === 0 ? 'Skipping build: only non-runtime or pending changelog files changed.'
    : 'Proceeding with build: runtime changes or comparison unavailable.');
  // Vercel uses exit 0 to skip and exit 1 to build.
  process.exitCode = result;
}
