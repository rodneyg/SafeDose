#!/usr/bin/env node
/**
 * Fail if the web export contains an OpenAI-style secret or a browser OpenAI client.
 * Prints matching file paths only — never secret values or surrounding snippets.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || path.join(process.cwd(), 'dist');
const KEY_RE = /sk-(?:proj|live|svcacct)-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|sk_(?:test|live)_[A-Za-z0-9]+|rk_(?:test|live)_[A-Za-z0-9]+/;
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
  if (KEY_RE.test(text)) keyHits.push(path.relative(process.cwd(), file));
  if (CLIENT_RE.test(text)) clientHits.push(path.relative(process.cwd(), file));
}

if (keyHits.length || clientHits.length) {
  if (keyHits.length) {
    console.error('[check-bundle-secrets] OpenAI-style secret pattern found in:');
    for (const file of keyHits) console.error(`  ${file}`);
  }
  if (clientHits.length) {
    console.error('[check-bundle-secrets] dangerouslyAllowBrowser found in:');
    for (const file of clientHits) console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log(`[check-bundle-secrets] ok — scanned ${files.length} files in ${path.relative(process.cwd(), ROOT) || ROOT}; no sk-/sk_ secrets or dangerouslyAllowBrowser`);
