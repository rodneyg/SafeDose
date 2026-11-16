const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { sameScreenshot } = require('../screenshots');

const baseline = fs.readFileSync(path.join(__dirname, '../baselines/linux/dose-result.png'));
function rewrite({ changePixels = false, changeHeader = false } = {}) {
  const chunks = [];
  for (let offset = 8; offset < baseline.length;) {
    const size = baseline.readUInt32BE(offset);
    const type = baseline.toString('ascii', offset + 4, offset + 8);
    let body = Buffer.from(baseline.subarray(offset + 8, offset + 8 + size));
    if (type === 'IDAT') {
      body = zlib.inflateSync(body);
      if (changePixels) body[10] ^= 1;
      body = zlib.deflateSync(body, { level: 1 });
    }
    if (type === 'IHDR' && changeHeader) body[3] ^= 1;
    // The comparison reads header and pixel data; CRC is irrelevant to this test.
    const chunk = Buffer.alloc(body.length + 12);
    chunk.writeUInt32BE(body.length);
    chunk.write(type, 4);
    body.copy(chunk, 8);
    chunks.push(chunk);
    offset += size + 12;
  }
  return Buffer.concat([baseline.subarray(0, 8), ...chunks]);
}
test('accepts identical pixels with different PNG compression', () => {
  const recompressed = rewrite();
  expect(recompressed.equals(baseline)).toBe(false);
  expect(sameScreenshot(baseline, recompressed)).toBe(true);
});
test('rejects pixel changes', () => {
  expect(sameScreenshot(baseline, rewrite({ changePixels: true }))).toBe(false);
});
test('rejects header changes', () => {
  expect(sameScreenshot(baseline, rewrite({ changeHeader: true }))).toBe(false);
});
