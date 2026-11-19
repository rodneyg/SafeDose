const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ExifTool } = require('exiftool-vendored');
const { validateLabel } = require('../validate-labels');
const { checkImages, stripImage } = require('../image-metadata');
const label = () => ({
  schema_version: 1, image_id: 'synthetic-1', image_sha256: 'a'.repeat(64), split: 'development',
  syringe: { type: 'insulin', scale: 'U-100', capacity_ml: 1, brand: 'synthetic', gradation: { value: 1, unit: 'units' } },
  fill: { units: 20, ml: 0.2, plunger_visible: true, empty: false },
  vial: { substance: null, total_amount: { value: null, unit: null }, concentration: { value: null, unit: null }, label_legible: null },
  conditions: { lighting: ['bright'], angle: 'straight', background: 'plain', focus: 'sharp', occlusion: 'none' },
  expected_behavior: 'read', reason: 'Synthetic validator fixture only',
  review: { labelers: ['reviewer-a', 'reviewer-b'], status: 'agreed', disagreements: [], adjudicator: null },
});
describe('label validation', () => {
  test('accepts a complete label', () => expect(validateLabel(label())).toEqual([]));
  test.each([
    l => delete l.fill,
    l => l.syringe.scale = 'unknown',
    l => l.fill.ml = -1,
    l => l.extra = true,
    l => l.review.labelers[1] = l.review.labelers[0],
    l => l.fill.plunger_visible = false,
    l => l.fill.empty = true,
    l => l.fill.ml = 2,
    l => l.fill.units = 5,
    l => l.vial.concentration.unit = 'mg/mL',
    l => l.syringe.scale = 'U-40',
    l => l.review.status = 'adjudicated',
  ])('rejects invalid or inconsistent data %#', change => {
    const data = label(); change(data); expect(validateLabel(data).length).toBeGreaterThan(0);
  });
  test('unknown and hidden readings remain null on refusal', () => {
    const data = label();
    data.fill = { units: null, ml: null, plunger_visible: false, empty: null };
    data.expected_behavior = 'refuse';
    expect(validateLabel(data)).toEqual([]);
  });
});
describe('metadata ingest', () => {
  let dir;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saf104-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  function tinyPng(file) {
    // A constant 1x1 pixel made solely for this test, never a photo or dataset image.
    fs.writeFileSync(file, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=', 'base64'));
  }
  test('checks recursively, detects ordinary EXIF plus GPS, strips without altering original', async () => {
    fs.mkdirSync(path.join(dir, 'nested'));
    const file = path.join(dir, 'nested', 'pixel.png'); tinyPng(file);
    expect(await checkImages(dir)).toBe(1);
    const tool = new ExifTool({ maxProcs: 1 });
    try { await tool.write(file, { 'EXIF:Make': 'Synthetic', ['GPS' + 'Latitude']: 1, ['GPS' + 'Longitude']: 2 }, ['-overwrite_original']); }
    finally { await tool.end(); }
    await expect(checkImages(dir)).rejects.toThrow();
    const original = fs.readFileSync(file);
    const clean = path.join(dir, 'clean.png');
    await stripImage(file, clean);
    expect(fs.readFileSync(file)).toEqual(original);
    fs.unlinkSync(file);
    expect(await checkImages(dir)).toBe(1);
    expect(fs.readdirSync(dir)).not.toContain('clean.png_original');
    await expect(stripImage(clean, clean)).rejects.toThrow();
  }, 30000);
  test('rejects EXIF without GPS', async () => {
    const file = path.join(dir, 'pixel.png'); tinyPng(file);
    const tool = new ExifTool({ maxProcs: 1 });
    try { await tool.write(file, { 'EXIF:Make': 'Synthetic' }, ['-overwrite_original']); }
    finally { await tool.end(); }
    await expect(checkImages(dir)).rejects.toThrow();
    const cli = spawnSync(process.execPath, [path.join(__dirname, '../check-exif.js'), dir]);
    expect(cli.status).toBe(1);
  }, 30000);
  test('fails closed for corrupt files, unsupported formats, and symlinks', async () => {
    const file = path.join(dir, 'bad.png'); fs.writeFileSync(file, 'invalid');
    await expect(checkImages(dir)).rejects.toThrow(); fs.unlinkSync(file);
    fs.writeFileSync(path.join(dir, 'bad.avif'), 'invalid');
    await expect(checkImages(dir)).rejects.toThrow(); fs.unlinkSync(path.join(dir, 'bad.avif'));
    fs.symlinkSync(os.tmpdir(), path.join(dir, 'linked'));
    await expect(checkImages(dir)).rejects.toThrow();
  }, 30000);
  test('metadata CLI rejects missing explicit paths', () => {
    expect(spawnSync(process.execPath, [path.join(__dirname, '../check-exif.js'), path.join(dir, 'missing')]).status).toBe(1);
  });
  test('failed sanitization removes the destination', async () => {
    const source = path.join(dir, 'broken.png');
    const dest = path.join(dir, 'output.png');
    fs.writeFileSync(source, 'not an image');
    await expect(stripImage(source, dest)).rejects.toThrow();
    expect(fs.existsSync(dest)).toBe(false);
  }, 30000);
  test('validator CLI rejects malformed JSON and duplicate IDs', () => {
    const file = path.join(dir, 'one.json'); fs.writeFileSync(file, '{');
    const script = path.join(__dirname, '../validate-labels.js');
    expect(spawnSync(process.execPath, [script, file]).status).toBe(1);
    fs.writeFileSync(file, JSON.stringify(label()));
    expect(spawnSync(process.execPath, [script, file]).status).toBe(0);
    fs.writeFileSync(path.join(dir, 'two.json'), JSON.stringify(label()));
    expect(spawnSync(process.execPath, [script, dir]).status).toBe(1);
  });
});
