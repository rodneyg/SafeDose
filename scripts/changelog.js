/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const groups = ['New', 'Improved', 'Fixed'];

function parseEntry(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error('Changelog entry needs frontmatter');
  const meta = Object.fromEntries(match[1].split(/\r?\n/).map(line => {
    const colon = line.indexOf(':');
    if (colon < 1) throw new Error('Invalid frontmatter');
    return [line.slice(0, colon), line.slice(colon + 1).trim()];
  }));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || !Number.isFinite(Date.parse(meta.date)) ||
      new Date(meta.date).toISOString().slice(0, 10) !== meta.date || !meta.title ||
      !['draft', 'published'].includes(meta.status)) throw new Error('Invalid changelog metadata');
  const sections = {};
  let current;
  for (const line of match[2].split(/\r?\n/)) {
    if (!line.trim()) continue;
    if (line.startsWith('## ') && groups.includes(line.slice(3))) {
      current = line.slice(3);
      sections[current] = sections[current] || [];
    } else if (line.startsWith('- ') && current) {
      sections[current].push(line.slice(2));
    } else throw new Error('Use New, Improved, Fixed headings and plain single-line bullets');
  }
  if (meta.status === 'published' && !Object.values(sections).some(items => items.length)) {
    throw new Error('Published entries need bullets');
  }
  if (text.includes('\u2014')) throw new Error('Use plain punctuation, no em dashes');
  return { ...meta, prs: (meta.prs || '').split(',').map(x => Number(x.trim())).filter(Boolean), sections };
}
function entries() {
  return fs.readdirSync(path.join(root, 'changelog')).filter(f => f.endsWith('.md'))
    .map(f => ({ id: f.slice(0, -3), ...parseEntry(fs.readFileSync(path.join(root, 'changelog', f), 'utf8')) }));
}
function build() {
  const published = entries().filter(e => e.status === 'published').sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  fs.writeFileSync(path.join(root, 'lib/changelog.json'), JSON.stringify(published, null, 2) + '\n');
}
function clean(text) {
  return text.replace(/\u2014/g, ',').replace(/[\r\n]+/g, ' ').trim();
}
function draft(pr) {
  const date = pr.merged_at.slice(0, 10);
  const section = (pr.body || '').match(/^## Changelog\s*\r?\n([\s\S]*?)(?=^## (?!New\s*$|Improved\s*$|Fixed\s*$)|$(?![\s\S]))/m)?.[1];
  let current = 'Improved';
  const bullets = {};
  for (const line of (section || '').split(/\r?\n/)) {
    const heading = line.match(/^#{2,3} (New|Improved|Fixed)\s*$/);
    if (heading) current = heading[1];
    else if (/^[-*] /.test(line)) (bullets[current] ||= []).push(clean(line.slice(2)));
  }
  if (!Object.keys(bullets).length) bullets.Improved = [clean(pr.title)];
  const body = groups.filter(g => bullets[g]?.length).map(g => `## ${g}\n${bullets[g].map(b => `- ${b}`).join('\n')}`).join('\n');
  return `---\ndate: ${date}\ntitle: ${clean(pr.title)}\nstatus: draft\nprs: ${pr.number}\n---\n${body}\n`;
}
function add() {
  const existing = entries();
  const seen = new Set(existing.flatMap(e => e.prs));
  const latest = existing.filter(e => e.status === 'published').map(e => e.date).sort().pop() || '1970-01-01';
  let prs;
  if (process.env.GITHUB_EVENT_PATH) prs = [JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request];
  else {
    const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], { cwd: root, encoding: 'utf8' }).trim();
    const pages = JSON.parse(execFileSync('gh', ['api', '--paginate', '--slurp', `repos/${repo}/pulls?state=closed&base=main&per_page=100`], { cwd: root, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }));
    prs = pages.flat();
  }
  let count = 0;
  for (const pr of prs) {
    if (!pr?.merged_at || pr.base.ref !== 'main' || pr.merged_at.slice(0, 10) < latest ||
        seen.has(pr.number) || pr.head.ref.startsWith('changelog/')) continue;
    const filename = path.join(root, 'changelog', `${pr.merged_at.slice(0, 10)}-pr-${pr.number}.md`);
    fs.writeFileSync(filename, draft(pr), { flag: 'wx' });
    seen.add(pr.number);
    count++;
  }
  console.log(`Created ${count} draft changelog entries. Review wording and set status: published to publish.`);
}
if (require.main === module) {
  if (process.argv[2] === 'build') build();
  else if (process.argv[2] === 'add') add();
  else throw new Error('Use build or add');
}
module.exports = { parseEntry, draft, build, add };
