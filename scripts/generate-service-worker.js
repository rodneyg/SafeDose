/* eslint-env node */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function generateServiceWorker(directory) {
  const files = [];
  function walk(folder) {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) {
        const relativeFolder = path.relative(directory, filename).split(path.sep).join('/');
        if (relativeFolder !== 'screenshots') walk(filename);
      } else if (/\.(html|js|css|png|jpg|jpeg|svg|webp|ico|ttf|otf|woff2?|webmanifest)$/.test(entry.name) && entry.name !== 'sw.js') {
        files.push(path.relative(directory, filename).split(path.sep).join('/'));
      }
    }
  }
  walk(directory);
  files.sort();
  const testRoute = files.find((file) => /\.(?:test|spec)\.html$/.test(file));
  if (testRoute) {
    throw new Error(`Test route found in web export: ${testRoute}`);
  }
  if (!files.includes('index.html') || !files.includes('manifest.webmanifest')) {
    throw new Error('Export the web app before generating its service worker.');
  }
  const template = fs.readFileSync(path.join(__dirname, 'service-worker.js'), 'utf8');
  const hash = crypto.createHash('sha256').update(template);
  let bytes = 0;
  for (const file of files) {
    const content = fs.readFileSync(path.join(directory, file));
    const nameBytes = Buffer.from(file, 'utf8');
    const nameLength = Buffer.alloc(4);
    nameLength.writeUInt32BE(nameBytes.length);
    const contentLength = Buffer.alloc(8);
    contentLength.writeBigUInt64BE(BigInt(content.length));
    hash.update(nameLength).update(nameBytes).update(contentLength).update(content);
    bytes += content.length;
  }
  const assets = files.map((file) => `/${file.split('/').map(encodeURIComponent).join('/')}`);
  const worker = template.replace('= __CACHE_NAME__', `= ${JSON.stringify(`safedose-static-${hash.digest('hex').slice(0, 16)}`)}`)
    .replace('= __ASSETS__', `= ${JSON.stringify(assets)}`);
  fs.writeFileSync(path.join(directory, 'sw.js'), worker);
  return { files: files.length, bytes };
}

if (require.main === module) {
  const result = generateServiceWorker(path.resolve(__dirname, '../dist'));
  console.log(`Offline build: ${result.files} static files, ${(result.bytes / 1024 / 1024).toFixed(2)} MiB`);
}
module.exports = { generateServiceWorker };
