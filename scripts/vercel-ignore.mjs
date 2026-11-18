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

export function ignoreBuild({ env = process.env, cwd = process.cwd() } = {}) {
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
  console.log(result === 0 ? 'Skipping preview: only non-runtime files changed.'
    : 'Proceeding with build: runtime changes or comparison unavailable.');
  // Vercel uses exit 0 to skip and exit 1 to build.
  process.exitCode = result;
}
