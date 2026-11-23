import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { DEPLOY_COMMIT, isChangelogPublished, isDeployExempt } from './vercel-ignore.mjs';

// Bot changelog commits no longer build on their own (see vercel-ignore.mjs).
// This sends one deploy commit for a whole batch of pending entries, so a burst
// of merges costs one build instead of one build per published entry.
const MINUTE = 60;

// Newest-first scan back to the last commit Vercel built: a deploy commit or
// any commit touching a file outside the exempt set. Changelog commits after it
// are pending. Returns what to do and why, without changing anything.
export function pendingChangelog({ cwd = process.cwd(), now = Date.now() / 1000,
  quietMinutes = 15, maxMinutes = 60, depth = 400 } = {}) {
  const raw = execFileSync('git', ['log', `-n${depth}`, '--format=%x01%H%x02%ct%x02%s', '--name-only'], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
  });
  const commits = raw.split('\x01').filter(Boolean).map((block) => {
    const [head, ...files] = block.split('\n');
    const [sha, time, subject] = head.split('\x02');
    return { sha, time: Number(time), subject, files: files.filter(Boolean) };
  });
  if (commits.length === 0) return { deploy: false, reason: 'no commits', pending: [] };
  const pending = [];
  let boundary = null;
  for (const commit of commits) {
    if (DEPLOY_COMMIT.test(commit.subject) || commit.files.some((p) => !isDeployExempt(p))) {
      boundary = commit;
      break;
    }
    if (commit.files.some(isChangelogPublished)) pending.push(commit);
  }
  if (!boundary) return { deploy: false, reason: 'no build boundary in history window', pending: [] };
  if (pending.length === 0) return { deploy: false, reason: 'nothing pending', pending: [] };
  const sinceHead = (now - commits[0].time) / MINUTE;
  const sinceOldest = (now - pending[pending.length - 1].time) / MINUTE;
  if (sinceHead >= quietMinutes || sinceOldest >= maxMinutes) {
    return { deploy: true, reason: sinceHead >= quietMinutes ? 'quiet period reached' : 'oldest pending entry too old', pending };
  }
  return { deploy: false, reason: 'waiting for quiet period', pending };
}

export function deployCommitMessage(pending) {
  return `deploy: publish ${pending.length} pending changelog ${pending.length === 1 ? 'entry' : 'entries'}`;
}

function main(argv) {
  const push = argv.includes('--push');
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 ? Number(argv[i + 1]) : fallback;
  };
  const options = { quietMinutes: arg('--quiet', 15), maxMinutes: arg('--max', 60) };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (push) { git('fetch', '--quiet', 'origin', 'main'); git('reset', '--hard', 'origin/main'); }
    const result = pendingChangelog(options);
    console.log(`${result.deploy ? 'Deploying' : 'Not deploying'}: ${result.reason}; pending=${result.pending.length}`);
    if (!result.deploy || !push) return 0;
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('commit', '--allow-empty', '-m', deployCommitMessage(result.pending));
    try { git('push', 'origin', 'HEAD:main'); console.log('Pushed deploy commit.'); return 0; }
    catch { console.log(`Push rejected on attempt ${attempt}; retrying.`); }
  }
  console.error('Could not push the deploy commit after three attempts.');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
