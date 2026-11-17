const path = require('node:path');
const fs = require('node:fs');
const { checkImages } = require('./image-metadata');
async function main() {
  if (process.argv.length > 3) throw new Error('Expected at most one image directory');
  const dirs = process.argv[2] ? [process.argv[2]] : [path.join(__dirname, 'images'), path.join(__dirname, '../images')].filter(dir => fs.existsSync(dir));
  let count = 0;
  for (const dir of dirs) count += await checkImages(dir);
  console.log(`Metadata check passed: ${count} images. Empty stores do not establish dataset readiness.`);
}
main().catch(() => {
  console.error('Image metadata check failed: metadata, unsupported files, or unreadable input.');
  process.exitCode = 1;
});
