import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { calculateDose, type CalculateDoseParams, type CalculateDoseResult } from '../../lib/dosing';
import { mapScanToDoseInputs, parseScanQuantity, type ScanResult } from '../../lib/scan';

export const REPORT_HEADER = 'LABELS PENDING RODNEY VERIFICATION: scores are not an official accuracy gate.';
export type Classification = 'exact-correct' | 'refused-or-asked' | 'unconfirmed-fill' | 'wrong-number-shown';
export type Fields = Record<string, string | number | boolean | null>;
export interface EvalLabel {
  id: string;
  file?: string;
  split?: 'development' | 'holdout';
  sha256: string;
  group: string;
  verified_by?: string;
  review: { status: string; reviewer: string };
  expected_behavior: 'read' | 'refuse';
  syringe?: { type: string | null; scale: string | null; capacity_ml: number | null; brand?: string | null } | null;
  fill?: { units: number | null; ml: number | null; plunger_visible: boolean | null; ground_truth?: string; tolerance?: string | null } | null;
  vial?: { substance?: string | null; total_amount?: number | null; total_unit?: string | null; concentration?: number | null; concentration_unit?: string | null; expiration?: string | null } | null;
  conditions?: { lighting?: string; angle?: string };
  dose?: DoseScenario;
}
export interface DoseScenario {
  doseValue: number;
  unit: CalculateDoseParams['unit'];
  solutionVolume?: string;
  // Independently authored expected output, NEVER calculated from the expected scan here.
  expected: { calculatedVolume: number; recommendedMarking: string };
}
export interface Fixture { label: EvalLabel; model_output: unknown; provenance: string; verified_by: string }
export interface EvalResult {
  id: string;
  sha256: string;
  sha256_kind: 'image' | 'text-fixture';
  group: string;
  brand: string;
  lighting: string;
  angle: string;
  source: 'synthetic' | 'recorded' | 'live' | 'not-evaluated';
  observed: boolean;
  image_status: string;
  expected_behavior: 'read' | 'refuse';
  expected: Fields;
  got: Fields;
  refused: boolean;
  asked: boolean;
  classification: Classification;
  mismatches: string[];
  reasons: string[];
  confidence: Record<string, number>;
  raw_model_output: string | null;
  pipeline: { status: string; expected: DoseScenario['expected'] | null; got: CalculateDoseResult | null };
  latency_ms: number;
  cost_usd: number | null;
  usage: { prompt_tokens: number; completion_tokens: number } | null;
}
export const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
export const verifySha256 = (bytes: Uint8Array, expected: string): boolean =>
  /^[a-f0-9]{64}$/i.test(expected) && sha256(bytes) === expected.toLowerCase();

/** Pixel reads require an explicit store. Resolve and reject path traversal before reading. */
export async function loadImage(root: string | undefined, label: EvalLabel): Promise<{
  status: string; bytes: Buffer | null;
}> {
  if (!root) throw new Error('SAFEDOSE_EVAL_IMAGES_DIR is required to read image pixels.');
  const store = resolve(root);
  const path = resolve(store, label.file ?? '');
  if (!label.file || !path.startsWith(store + sep) || !/\.(jpe?g|png|webp)$/i.test(path)) return { status: 'invalid-path', bytes: null };
  try {
    const bytes = await readFile(path);
    return verifySha256(bytes, label.sha256) ? { status: 'verified', bytes } : { status: 'sha256-mismatch', bytes: null };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'missing-image', bytes: null };
    throw error;
  }
}

const normalizeText = (value: string | null | undefined): string | null => value?.trim().toLowerCase().replace(/\s+/g, ' ') || null;
function unit(value: string | null | undefined): string | null {
  const v = normalizeText(value);
  return v?.replace(/^(?:iu|u|usp units)(?=\/ml$|$)/, 'units') ?? null;
}
export function expectedFields(label: EvalLabel): Fields {
  return {
    'syringe.type': normalizeText(label.syringe?.type),
    'syringe.scale': label.syringe?.scale ?? null,
    'syringe.capacity_ml': label.syringe?.capacity_ml ?? null,
    'fill.units': label.fill?.units ?? null,
    'fill.ml': label.fill?.ml ?? null,
    'fill.plunger_visible': label.fill?.plunger_visible ?? null,
    'vial.substance': normalizeText(label.vial?.substance),
    'vial.total_amount': label.vial?.total_amount ?? null,
    'vial.total_unit': unit(label.vial?.total_unit),
    'vial.concentration': label.vial?.concentration ?? null,
    'vial.concentration_unit': unit(label.vial?.concentration_unit),
    'vial.expiration': label.vial?.expiration ?? null,
  };
}
export function gotFields(scan: ScanResult): Fields {
  const total = parseScanQuantity(scan.vial.totalAmount);
  const concentration = parseScanQuantity(scan.vial.concentration, true);
  return {
    'syringe.type': normalizeText(scan.syringe.type), 'syringe.scale': scan.syringe.scale,
    'syringe.capacity_ml': scan.syringe.capacity_ml,
    'fill.units': scan.fill.units, 'fill.ml': scan.fill.ml, 'fill.plunger_visible': scan.fill.plunger_visible,
    'vial.substance': normalizeText(scan.vial.substance),
    'vial.total_amount': total?.value ?? null, 'vial.total_unit': total?.unit ?? null,
    'vial.concentration': concentration?.value ?? null,
    'vial.concentration_unit': concentration ? `${concentration.unit}/ml` : null,
    'vial.expiration': scan.vial.expiration,
  };
}

/** Strict equality, including exact rendered fills. Estimated tolerances are preserved, not silently interpreted. */
export function fieldMismatches(expected: Fields, got: Fields): string[] {
  return Object.keys(expected).filter(key => expected[key] !== null && expected[key] !== 'unknown' && expected[key] !== got[key]);
}

export function runDosePipeline(
  scan: ScanResult,
  scenario?: DoseScenario,
  { syringeAndVialVerified = false }: { syringeAndVialVerified?: boolean } = {},
): EvalResult['pipeline'] {
  if (!scenario) return { status: 'no-dose-scenario', expected: null, got: null };
  const mapped = mapScanToDoseInputs(scan, { syringeAndVialVerified });
  const asked = (status: string): EvalResult['pipeline'] => ({ status, expected: scenario.expected, got: null });
  if (mapped.status !== 'ready') return asked(mapped.status);
  if (!Number.isFinite(scenario.doseValue) || scenario.doseValue <= 0 || !['mg', 'mcg', 'units', 'mL'].includes(scenario.unit)) return asked('invalid-dose-context');
  const input = mapped.inputs;
  const concentration = input.concentration;
  let concentrationUnit = input.concentrationUnit;
  const fromTotal = concentration === null && input.totalAmount !== null && input.totalAmountUnit !== null;
  if (fromTotal && input.totalAmountUnit) {
    if (!scenario.solutionVolume || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(scenario.solutionVolume) || !Number.isFinite(Number(scenario.solutionVolume)) || Number(scenario.solutionVolume) <= 0) return asked('needs-solution-volume');
    concentrationUnit = `${input.totalAmountUnit}/ml`;
  }
  if ((!fromTotal && concentration === null) || (concentration !== null && !Number.isFinite(concentration)) || !concentrationUnit || !input.manualSyringe) return asked('needs-concentration-or-syringe');
  const got = calculateDose({
    doseValue: scenario.doseValue, unit: scenario.unit, manualSyringe: input.manualSyringe,
    concentration, concentrationUnit,
    // The concentration prefill path does not pass an optional vial total into the app calculator.
    totalAmount: input.concentration === null ? input.totalAmount : null,
    totalAmountUnit: fromTotal ? input.totalAmountUnit : null,
    solutionVolume: scenario.solutionVolume,
  });
  return { status: got.recommendedMarking === null ? 'calculator-asked' : 'number-shown', expected: scenario.expected, got };
}

export function classifyResult(input: {
  refused: boolean; asked: boolean; expectedBehavior: 'read' | 'refuse'; mismatches: string[];
  numberShown?: boolean;
  unconfirmedFill?: boolean;
}): Classification {
  const wrong = input.expectedBehavior === 'refuse' || input.mismatches.length > 0;
  if (input.refused || (input.asked && !(input.numberShown && wrong))) return 'refused-or-asked';
  if (wrong) return 'wrong-number-shown';
  return input.unconfirmedFill ? 'unconfirmed-fill' : 'exact-correct';
}

export function scoreScan(label: EvalLabel, scan: ScanResult, meta: {
  source: EvalResult['source']; image_status: string; latency_ms: number;
  cost_usd: number | null; usage?: EvalResult['usage'];
  syringeAndVialVerified?: boolean;
}): EvalResult {
  const observed = meta.source !== 'not-evaluated';
  const expected = expectedFields(label), got = gotFields(scan);
  const { syringeAndVialVerified, ...observation } = meta;
  const pipeline = runDosePipeline(scan, label.dose, { syringeAndVialVerified });
  const mapped = mapScanToDoseInputs(scan);
  const asked = !observed || mapped.status === 'needs-input' ||
    !['no-dose-scenario', 'needs-verification', 'number-shown'].includes(pipeline.status);
  const mismatches = fieldMismatches(expected, got);
  // Conservatively score any numeric output, even on an error, as potentially visible.
  // SAF-103 clears rejected outputs; this still detects a regression in that contract.
  const volumeShown = pipeline.got?.calculatedVolume !== null && pipeline.got?.calculatedVolume !== undefined && Number.isFinite(pipeline.got.calculatedVolume);
  const markingShown = pipeline.got?.recommendedMarking !== null && pipeline.got?.recommendedMarking !== undefined;
  if (pipeline.got && pipeline.expected) {
    if (volumeShown && pipeline.got.calculatedVolume !== pipeline.expected.calculatedVolume) mismatches.push('dose.calculatedVolume');
    if (markingShown && pipeline.got.recommendedMarking !== pipeline.expected.recommendedMarking) mismatches.push('dose.recommendedMarking');
  }
  // The preview displays syringe metadata and vial label fields. It never renders the model fill.
  // Keep all raw mismatches for accuracy analysis and score only visible fields for safety.
  const visibleMismatches = mismatches.filter(key => !key.startsWith('fill.'));
  return {
    id: label.id, sha256: label.sha256, sha256_kind: meta.source === 'synthetic' ? 'text-fixture' : 'image',
    group: label.group, brand: label.syringe?.brand ?? 'untagged',
    lighting: label.conditions?.lighting ?? 'untagged', angle: label.conditions?.angle ?? 'untagged',
    ...observation, usage: meta.usage ?? null, observed, expected_behavior: label.expected_behavior, expected, got,
    refused: observed && scan.refuse, asked, pipeline, mismatches, confidence: scan.confidence,
    raw_model_output: observed ? scan.raw : null,
    reasons: !observed ? [`Not evaluated: ${meta.image_status}. No model prediction is claimed.`] : mapped.reasons,
    classification: classifyResult({
      refused: scan.refuse, asked, expectedBehavior: label.expected_behavior,
      mismatches: visibleMismatches, numberShown: observed && (volumeShown || markingShown),
      unconfirmedFill: mapped.status === 'needs-verification',
    }),
  };
}

interface FieldAccuracy { correct: number; evaluated: number; labeled: number; accuracy: number | null }
interface Counts {
  total: number; observed: number; not_evaluated: number;
  classes: Record<Classification, number>;
  refusal_rate: number | null;
  field_accuracy: Record<string, FieldAccuracy>;
  uncaught_syringe_misses: number;
}
export interface EvalSummary extends Counts {
  by_group: Record<string, Counts>;
  by_brand: Record<string, Counts>;
  by_lighting: Record<string, Counts>;
  by_angle: Record<string, Counts>;
  wrong_number_cases: Array<{ id: string; sha256: string; sha256_kind: string; mismatches: string[] }>;
}
function counts(rows: EvalResult[]): Counts {
  const field_accuracy: Record<string, FieldAccuracy> = {};
  const classes: Counts['classes'] = { 'exact-correct': 0, 'refused-or-asked': 0, 'unconfirmed-fill': 0, 'wrong-number-shown': 0 };
  let observed = 0, refused = 0, uncaught_syringe_misses = 0;
  for (const row of rows) {
    classes[row.classification]++;
    if (row.observed) { observed++; if (row.refused) refused++; }
    for (const [key, expected] of Object.entries(row.expected)) {
      if (expected === null || expected === 'unknown') continue;
      // Recognition thresholds are explicitly scoped to readable labels.
      if (key.startsWith('syringe.') && row.expected_behavior !== 'read') continue;
      const field = field_accuracy[key] ??= { correct: 0, evaluated: 0, labeled: 0, accuracy: null };
      field.labeled++;
      if (row.observed) {
        field.evaluated++;
        if (expected === row.got[key]) field.correct++;
        if (['syringe.type', 'syringe.capacity_ml'].includes(key) && expected !== row.got[key] && !row.refused && (!row.asked || row.classification === 'wrong-number-shown')) uncaught_syringe_misses++;
      }
    }
  }
  for (const field of Object.values(field_accuracy)) field.accuracy = field.evaluated ? field.correct / field.evaluated : null;
  return { total: rows.length, observed, not_evaluated: rows.length - observed, classes,
    refusal_rate: observed ? refused / observed : null, field_accuracy, uncaught_syringe_misses };
}
export function summarize(rows: EvalResult[]): EvalSummary {
  const groupBy = (key: 'group' | 'brand' | 'lighting' | 'angle') => {
    const groups: Record<string, EvalResult[]> = Object.create(null);
    for (const row of rows) (groups[row[key]] ??= []).push(row);
    return Object.fromEntries(Object.entries(groups).map(([name, entries]) => [name, counts(entries)]));
  };
  return { ...counts(rows), by_group: groupBy('group'), by_brand: groupBy('brand'), by_lighting: groupBy('lighting'), by_angle: groupBy('angle'),
    wrong_number_cases: rows.filter(row => row.classification === 'wrong-number-shown').map(({ id, sha256, sha256_kind, mismatches }) => ({ id, sha256, sha256_kind, mismatches })),
  };
}

export interface Thresholds {
  status: string; approved_by: string | null;
  wrong_number_shown_allowed: number;
  syringe_type_min_accuracy: number;
  syringe_capacity_min_accuracy: number;
  uncaught_syringe_misses_allowed: number;
}
export function evaluateThresholds(summary: EvalSummary, thresholds: Thresholds) {
  const violations: string[] = [], unassessed: string[] = [];
  const wrong_number_shown_pass = summary.classes['wrong-number-shown'] <= thresholds.wrong_number_shown_allowed;
  if (!wrong_number_shown_pass) violations.push(`wrong-number-shown exceeds the allowance of ${thresholds.wrong_number_shown_allowed}`);
  if (summary.uncaught_syringe_misses > thresholds.uncaught_syringe_misses_allowed) violations.push('a syringe miss was not caught by refusal/confirmation');
  for (const [field, minimum] of [['syringe.type', thresholds.syringe_type_min_accuracy], ['syringe.capacity_ml', thresholds.syringe_capacity_min_accuracy]] as const) {
    const accuracy = summary.field_accuracy[field]?.accuracy;
    if (accuracy === null || accuracy === undefined) unassessed.push(field);
    else if (accuracy < minimum) violations.push(`${field} accuracy ${accuracy} is below ${minimum}`);
  }
  return { would_pass: violations.length === 0 && unassessed.length === 0, wrong_number_shown_pass, violations, unassessed, status: thresholds.status };
}

export function renderMarkdown(summary: EvalSummary, gate: ReturnType<typeof evaluateThresholds>, context: {
  mode: string; commit: string; enforced: boolean; manifest_count: number;
}): string {
  const pct = (v: number | null) => v === null ? 'not evaluated' : `${(v * 100).toFixed(2)}%`;
  const safe = (v: string) => v.replace(/[|\r\n]/g, ' ');
  const lines = [`# ${REPORT_HEADER}`, '', `Mode: ${context.mode}. Commit: ${context.commit}. Local label set: ${context.manifest_count}. Live baseline: **${context.mode === 'live' ? 'this run; labels pending verification' : 'not yet run'}**.`, '',
    'Synthetic fixtures are authored test doubles, not recorded image predictions. Missing recordings are not accuracy observations. Strict field equality is used; photo estimates and their tolerances still need Rodney review.', '',
    `Observed: ${summary.observed}/${summary.total}. Not evaluated: ${summary.not_evaluated}. Refusal rate (observed only): ${pct(summary.refusal_rate)}.`, '',
    '| Class | Count |', '| --- | ---: |', ...Object.entries(summary.classes).map(([key, value]) => `| ${key} | ${value} |`), '',
    'Unconfirmed fill means the scan withheld its fill reading and requires a physical syringe and vial label check. Model fill errors still count in raw field accuracy.', '',
    'Unevaluated rows are placed in refused-or-asked with an explicit not-evaluated reason. They are excluded from field accuracy and refusal-rate denominators.', '',
    '| Field (syringe fields on readable labels) | Correct | Evaluated | Labeled | Accuracy |', '| --- | ---: | ---: | ---: | ---: |',
    ...Object.entries(summary.field_accuracy).map(([key, v]) => `| ${key} | ${v.correct} | ${v.evaluated} | ${v.labeled} | ${pct(v.accuracy)} |`), '',
    `Would-be gate: **${gate.would_pass ? 'PASS' : 'FAIL'}**. Enforcement: **${context.enforced ? 'on' : 'informational'}** (${gate.status}).`,
    ...gate.violations.map(v => `- ${v}`), ...gate.unassessed.map(v => `- No observations for ${v}`), '',
  ];
  for (const [dimension, groups] of Object.entries({ group: summary.by_group, brand: summary.by_brand, lighting: summary.by_lighting, angle: summary.by_angle })) {
    lines.push(`## By ${dimension}`, '', '| Tag | Observed / total | Exact | Refused/asked | Unconfirmed fill | Wrong number | Refusal rate | Type accuracy | Capacity accuracy | Fill mL accuracy | Vial concentration accuracy |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const [tag, c] of Object.entries(groups)) lines.push(`| ${safe(tag)} | ${c.observed}/${c.total} | ${c.classes['exact-correct']} | ${c.classes['refused-or-asked']} | ${c.classes['unconfirmed-fill']} | ${c.classes['wrong-number-shown']} | ${pct(c.refusal_rate)} | ${pct(c.field_accuracy['syringe.type']?.accuracy ?? null)} | ${pct(c.field_accuracy['syringe.capacity_ml']?.accuracy ?? null)} | ${pct(c.field_accuracy['fill.ml']?.accuracy ?? null)} | ${pct(c.field_accuracy['vial.concentration']?.accuracy ?? null)} |`);
    lines.push('');
  }
  lines.push('## Every wrong-number-shown case', '');
  if (!summary.wrong_number_cases.length) lines.push('None in evaluated cases.');
  for (const row of summary.wrong_number_cases) lines.push(`- ${safe(row.id)}: sha256 ${row.sha256} (${row.sha256_kind}); ${row.mismatches.join(', ') || 'expected refusal but accepted numeric fields'}`);
  lines.push('', 'Full expected/got fields, dose pipeline, per-tag field accuracy, latency, usage, and cost are in the adjacent JSON report. Offline cost is $0. Live cost is null unless explicit current token rates are supplied; it is never guessed.', '');
  return lines.join('\n');
}
