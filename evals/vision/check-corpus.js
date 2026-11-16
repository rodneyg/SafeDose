// Offline schema, duplicate, split-lock, and inventory consistency guard. No pixels.
const fs = require('node:fs');
const path = require('node:path');
const { validateLabel } = require('./validate-labels');
function checkCorpus(entries, lock, readLabel = p => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'))) {
  const ids = new Set(), hashes = new Set(), sessions = new Map();
  if (!Array.isArray(entries) || entries.length < 200 || !Array.isArray(lock.inventory)) throw new Error('Incomplete corpus');
  if (lock.inventory.length !== entries.length) throw new Error('Lock length mismatch');
  for (const [index, entry] of entries.entries()) {
    const label = entry.label;
    const errors = validateLabel(label);
    if (errors.length) throw new Error(`Invalid label ${entry.id}: ${errors.join('; ')}`);
    if (ids.has(entry.id) || hashes.has(entry.sha256)) throw new Error('Duplicate ID or pixel hash');
    ids.add(entry.id); hashes.add(entry.sha256);
    if (entry.id !== label.image_id || entry.sha256 !== label.image_sha256 || entry.split !== label.split || entry.expected_behavior !== label.expected_behavior) throw new Error('Label/inventory mismatch');
    if (entry.file !== `images/${entry.id}.png` || entry.label_file !== `labels/synthetic-v1/${entry.id}.json`) throw new Error('Invalid corpus path');
    if (JSON.stringify(readLabel(entry.label_file)) !== JSON.stringify(label)) throw new Error('Canonical label copy differs');
    if (entry.verified_by !== 'pending-rodney' || label.review.status !== 'pending' || !entry.source || !entry.license || !entry.notes) throw new Error('Invalid provenance or review status');
    if (sessions.has(entry.group) && sessions.get(entry.group) !== entry.split) throw new Error('Session leaks across splits');
    sessions.set(entry.group, entry.split);
    const frozen = lock.inventory[index];
    if (frozen.id !== entry.id || frozen.sha256 !== entry.sha256 || frozen.split !== entry.split || frozen.session !== entry.group) throw new Error('Split lock changed');
  }
  if (entries.filter(e => e.split === 'holdout').length !== Math.ceil(entries.length * .2)) throw new Error('Holdout must be exactly 20% rounded up');
  return entries.length;
}
if (require.main === module) {
  try {
    const count = checkCorpus(require('./synthetic-manifest.json'), require('./synthetic-split-lock.json'));
    console.log(`Corpus: ${count} strict labels, unique hashes, canonical copies and grouped 20% split lock passed. Human verification pending.`);
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { checkCorpus };
