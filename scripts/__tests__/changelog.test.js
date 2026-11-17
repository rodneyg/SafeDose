/* global test, expect, jest, __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { parseEntry, draft } = require('../changelog');
const pr = { number: 999, title: 'A fallback title', merged_at: '2026-11-16T12:00:00Z' };
test('draft prefers changelog groups and excludes unrelated PR details', () => {
  const entry = parseEntry(draft({ ...pr, body: '## Summary\nInternal details\n## Changelog\n### New\n- A visible feature\n### Fixed\n- A visible fix\n## Tests\n- Private test details' }));
  expect(entry.status).toBe('draft');
  expect(entry.prs).toEqual([999]);
  expect(entry.sections).toEqual({ New: ['A visible feature'], Fixed: ['A visible fix'] });
});
test('fallback title remains an unpublished draft and uses plain punctuation', () => {
  const entry = parseEntry(draft({ ...pr, title: 'Improved scans\u2014clearer feedback' }));
  expect(entry.status).toBe('draft');
  expect(entry.sections.Improved).toEqual(['Improved scans,clearer feedback']);
});
test('parser rejects invalid dates and malformed published entries', () => {
  const valid = draft(pr).replace('status: draft', 'status: published');
  expect(() => parseEntry(valid.replace('2026-11-16', '2026-02-30'))).toThrow();
  expect(() => parseEntry(valid.replace('- A fallback title', 'unexpected text'))).toThrow();
});
test('public generated data matches published source only, newest first', () => {
  const source = fs.readdirSync(path.join(__dirname, '../../changelog')).filter(f => f.endsWith('.md')).map(f => ({ id: f.slice(0, -3), ...parseEntry(fs.readFileSync(path.join(__dirname, '../../changelog', f), 'utf8')) })).filter(e => e.status === 'published').sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  expect(require('../../lib/changelog.json')).toEqual(source);
});
test('update skips already represented PRs, unmerged PRs and changelog branches', () => {
  const { add } = require('../changelog');
  // The event path lets the Action avoid any GitHub API request.
  const oldPath = process.env.GITHUB_EVENT_PATH;
  process.env.GITHUB_EVENT_PATH = '/mock-event.json';
  const read = jest.spyOn(fs, 'readFileSync');
  const readdir = jest.spyOn(fs, 'readdirSync').mockReturnValue(['seed.md']);
  const write = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const seed = '---\ndate: 2026-11-16\ntitle: Seed\nstatus: published\nprs: 999\n---\n## Fixed\n- A fix\n';
  let event = { ...pr, base: { ref: 'main' }, head: { ref: 'fix/a' } };
  read.mockImplementation(filename => filename === '/mock-event.json' ? JSON.stringify({pull_request:event}) : seed);
  try {
    add();
    expect(write).not.toHaveBeenCalled();
    event = { ...event, number:1000, merged_at:null };
    add();
    expect(write).not.toHaveBeenCalled();
    event = { ...event, merged_at:pr.merged_at, head:{ref:'changelog/pr-999'} };
    add();
    expect(write).not.toHaveBeenCalled();
    event = { ...event, head:{ref:'fix/b'} };
    add();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][2]).toEqual({flag:'wx'});
    expect(parseEntry(write.mock.calls[0][1]).status).toBe('draft');
  } finally {
    read.mockRestore(); readdir.mockRestore(); write.mockRestore(); log.mockRestore();
    if (oldPath === undefined) delete process.env.GITHUB_EVENT_PATH;
    else process.env.GITHUB_EVENT_PATH = oldPath;
  }
});
