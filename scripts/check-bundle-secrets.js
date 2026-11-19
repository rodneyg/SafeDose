#!/usr/bin/env node
/**
 * Fail if the web export or resolved Expo extra contains a secret.
 * Prints matching file paths only — never secret values or surrounding snippets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.join(process.cwd(), 'dist');
const KEY_RE = /sk-[A-Za-z0-9_-]+|(?:sk|rk)_(?:test|live)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+/;
function hasSecret(text) {
  const openAIKey = process.env.OPENAI_API_KEY;
  return KEY_RE.test(text) || Boolean(openAIKey && text.includes(openAIKey));
}
const CLIENT_RE = /dangerouslyAllowBrowser/;
const EXTENSIONS = new Set(['.js', '.css', '.html', '.json', '.map', '.txt']);

function walk(dir, files) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

if (!fs.existsSync(ROOT)) {
  console.error(`[check-bundle-secrets] missing directory: ${ROOT}`);
  process.exit(2);
}

const files = walk(ROOT, []);
const keyHits = [];
const clientHits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (hasSecret(text)) keyHits.push(path.relative(process.cwd(), file));
  if (CLIENT_RE.test(text)) clientHits.push(path.relative(process.cwd(), file));
}

// Resolve config without printing any values. Scan only client-visible extra.
const config = require(path.join(process.cwd(), 'app.config.js'));
const resolved = typeof config === 'function' ? config({ config: {} }) : config;
if (hasSecret(JSON.stringify(resolved.extra || {}))) keyHits.push('app.config.js extra');

if (keyHits.length || clientHits.length) {
  if (keyHits.length) {
    console.error('[check-bundle-secrets] Secret pattern found in:');
    for (const file of keyHits) console.error(`  ${file}`);
  }
  if (clientHits.length) {
    console.error('[check-bundle-secrets] dangerouslyAllowBrowser found in:');
    for (const file of clientHits) console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log(`[check-bundle-secrets] ok — scanned ${files.length} files in ${path.relative(process.cwd(), ROOT) || ROOT}; no secret patterns or dangerouslyAllowBrowser`);
