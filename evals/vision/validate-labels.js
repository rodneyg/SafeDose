const fs = require('node:fs');
const path = require('node:path');
const Ajv = require('ajv');
const schema = require('./label.schema.json');
const check = new Ajv({ allErrors: true, strict: false }).compile(schema);

function validateLabel(label) {
  if (!check(label)) return check.errors.map(e => `${e.instancePath || '/'} ${e.message}`);
  const errors = [];
  const { syringe, fill, vial, review } = label;
  for (const q of [syringe.gradation, vial.total_amount, vial.concentration]) {
    if ((q.value === null) !== (q.unit === null)) errors.push('Quantity value and unit must both be known or both null');
  }
  if (!fill.plunger_visible && (fill.ml !== null || fill.units !== null || fill.empty !== null)) errors.push('Hidden plunger requires null fill readings');
  if (fill.empty === true && (fill.ml !== 0 || (fill.units !== null && fill.units !== 0))) errors.push('Empty fill must be zero');
  if (fill.ml !== null && syringe.capacity_ml !== null && fill.ml > syringe.capacity_ml) errors.push('Fill exceeds capacity');
  if (fill.units !== null && !['U-100', 'U-40'].includes(syringe.scale)) errors.push('Units require a known insulin scale');
  if (fill.units !== null && fill.ml !== null && Math.abs(fill.units - fill.ml * (syringe.scale === 'U-100' ? 100 : 40)) > 1e-6) errors.push('Fill units and mL disagree');
  if (label.expected_behavior === 'read' && (syringe.type === 'other' || !syringe.type || !syringe.capacity_ml || !syringe.scale || syringe.scale === 'U-40' || !fill.plunger_visible || fill.ml === null || !syringe.gradation.value)) errors.push('Read requires supported readable syringe, scale, gradation and fill');
  if (label.expected_behavior === 'read' && !((syringe.type === 'insulin' && syringe.scale === 'U-100' && [0.3, 0.5, 1].includes(syringe.capacity_ml)) || (syringe.type === 'standard' && syringe.scale === 'mL' && [1, 3, 5].includes(syringe.capacity_ml)))) errors.push('Unsupported syringe configuration');
  if (label.expected_behavior === 'read' && (!fill.plunger_visible || fill.ml === null || syringe.gradation.value === null || vial.label_legible === false)) errors.push('Read requires visible fill and gradations, without an illegible vial label');
  if (review.status === 'agreed' && review.disagreements.length) errors.push('Disagreements require adjudication');
  if (review.status === 'adjudicated' && (!review.adjudicator || review.labelers.includes(review.adjudicator) || review.disagreements.some(d => !d.resolution))) errors.push('Adjudication requires independent adjudicator and resolutions');
  return errors;
}
function filesIn(dir) {
  if (fs.lstatSync(dir).isSymbolicLink()) throw new Error('Symlinks are not permitted');
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const file = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw new Error('Symlinks are not permitted');
    return e.isDirectory() ? filesIn(file) : [file];
  });
}
function main(args) {
  const files = args.length ? args.flatMap(f => fs.statSync(f).isDirectory() ? filesIn(f).filter(f => f.endsWith('.json')) : [f]) : filesIn(path.join(__dirname, 'labels')).filter(f => f.endsWith('.json'));
  const ids = new Set();
  let failures = 0;
  for (const file of files) {
    try {
      const label = JSON.parse(fs.readFileSync(file, 'utf8'));
      const errors = validateLabel(label);
      if (ids.has(label.image_id)) errors.push('Duplicate image_id');
      ids.add(label.image_id);
      if (errors.length) { failures++; console.error(`${path.basename(file)}: ${errors.join('; ')}`); }
    } catch { failures++; console.error(`${path.basename(file)}: unreadable or invalid JSON`); }
  }
  console.log(`Validated ${files.length} labels; ${failures} failed. Empty sets do not establish dataset readiness.`);
  return failures ? 1 : 0;
}
if (require.main === module) { try { process.exitCode = main(process.argv.slice(2)); } catch { console.error('Cannot read label input'); process.exitCode = 1; } }
module.exports = { validateLabel, filesIn, main };
