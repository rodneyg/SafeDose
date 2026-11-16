const fs = require('node:fs');
const path = require('node:path');
const { ExifTool } = require('exiftool-vendored');
const { filesIn } = require('./validate-labels');
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);
function imageFiles(dir) {
  return filesIn(dir).filter(file => {
    if (path.basename(file) === '.gitkeep') return false;
    if (!supported.has(path.extname(file).toLowerCase())) throw new Error('Unsupported file in image directory');
    return true;
  });
}
async function assertClean(tool, file) {
  // Family 0 groups identify every EXIF IFD, including GPS, maker notes and thumbnails.
  const tags = await tool.readRaw(path.resolve(file), ['-G0', '-a', '-s']);
  if (!['JPEG', 'PNG', 'WEBP', 'HEIC', 'HEIF'].includes(tags['File:FileType']) || tags.errors?.length || tags.warnings?.length) throw new Error('Unrecognized or damaged image');
  if (Object.keys(tags).some(k => /^(EXIF|XMP|IPTC):/.test(k) || /GPS|ExifByteOrder|ExifOffset/i.test(k))) throw new Error('Embedded EXIF/GPS or identifying metadata remains');
}
async function checkImages(dir) {
  const files = imageFiles(dir);
  const tool = new ExifTool({ maxProcs: 1 });
  try { for (const file of files) await assertClean(tool, file); }
  finally { await tool.end(); }
  return files.length;
}
async function stripImage(source, destination) {
  if (!supported.has(path.extname(source).toLowerCase()) || path.extname(source).toLowerCase() !== path.extname(destination).toLowerCase()) throw new Error('Use matching supported source and destination extensions');
  if (fs.lstatSync(source).isSymbolicLink()) throw new Error('Symlinks are not permitted');
  // Exclusive creation prevents overwriting originals. Never create metadata-bearing backups.
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  const tool = new ExifTool({ maxProcs: 1 });
  try {
    await tool.write(path.resolve(destination), {}, ['-all=', '-overwrite_original']);
    await assertClean(tool, destination);
  } catch (error) { fs.unlinkSync(destination); throw error; }
  finally { await tool.end(); }
}
module.exports = { assertClean, checkImages, stripImage };
