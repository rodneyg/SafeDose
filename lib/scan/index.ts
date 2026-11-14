import { syringeOptions, type CalculateDoseParams } from '../dosing';

// Snapshot rather than the moving gpt-4o alias. No client or credentials live here.
export const SCAN_MODEL = 'gpt-4o-2024-08-06';
export const SCAN_MIN_CONFIDENCE = 0.9;
export const SCAN_PROMPT = `Analyze the image for syringe and vial details. Return ONLY a valid JSON object:
{"syringe":{"type":"Insulin | Standard | unreadable | null","volume":"1 ml | 0.5 ml | unreadable | null","markings":"comma-separated visible numeric marks | unreadable | null","scale":"U-100 | U-40 | mL | unknown | null"},"vial":{"substance":null,"totalAmount":null,"concentration":null,"expiration":null},"fill":{"units":null,"ml":null,"plunger_visible":null},"confidence":{"syringe.type":0,"syringe.capacity_ml":0,"syringe.scale":0,"syringe.markings":0,"fill.units":0,"fill.ml":0,"fill.plunger_visible":0,"vial.substance":0,"vial.totalAmount":0,"vial.concentration":0,"vial.expiration":0},"refuse":true,"refuse_reason":null}
Keep the existing syringe type/volume/markings and vial substance/totalAmount/concentration/expiration fields.
Use null only for absent/not visible information; use "unreadable" for present but illegible text.
Copy vial values WITH explicit printed units (e.g. "20 mg", "100 units/ml", "10 mg/ml"). Never infer a missing unit, syringe type, capacity, or scale. Do not infer U-100 from appearance or medication concentration.
Read fill from the leading plunger edge nearest the needle, including between-marks values without snapping. Set plunger_visible false if hidden. Fill units are syringe scale units, not medication units. Supply mL only if the scale establishes the conversion.
Confidence is a number from 0 to 1 for EACH populated field, including plunger visibility; use 0 for absent fields.
Set refuse true for unreadable fields, unknown scale, confidence below 0.90, hidden plunger when estimating fill, garbled/reversed/inconsistent scales, contradictory labels, unsupported U-40 conversion, unsafe/ambiguous or implausible/AI-generated details. Recommend refusal rather than inventing information. Set refuse_reason to a brief reason. Never calculate a treatment dose.`;

export function buildScanRequest(image: string) {
  return {
    model: SCAN_MODEL,
    temperature: 0,
    response_format: { type: 'json_object' as const },
    messages: [{ role: 'user' as const, content: [
      { type: 'text' as const, text: SCAN_PROMPT },
      { type: 'image_url' as const, image_url: { url: image } },
    ] }],
  };
}

export interface ScanResult {
  syringe: {
    type: 'Insulin' | 'Standard' | null;
    volume: string | null;
    markings: string | null;
    scale: 'U-100' | 'U-40' | 'mL' | null;
    capacity_ml: number | null;
  };
  vial: { substance: string | null; totalAmount: string | null; concentration: string | null; expiration: string | null };
  fill: { units: number | null; ml: number | null; plunger_visible: boolean | null };
  confidence: Record<string, number>;
  refuse: boolean;
  reasons: string[];
  raw: string;
  capturedImage?: { uri: string; mimeType: string };
}

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const DECIMAL = '(?:0|[1-9]\\d*)(?:\\.\\d+)?';

/** Strict quantities: no parseFloat prefixes, decimal commas, inferred units, or mass/IU conversions. */
export function parseScanQuantity(value: string | null, concentration = false):
  { value: number; unit: 'mg' | 'mcg' | 'units' } | null {
  if (!value) return null;
  const match = value.match(new RegExp(`^(${DECIMAL})\\s*(mg|mcg|µg|μg|units|u|iu|usp units)${concentration ? '\\s*/\\s*ml' : ''}$`, 'i'));
  if (!match || !Number.isFinite(Number(match[1])) || Number(match[1]) <= 0) return null;
  const unit = match[2].toLowerCase();
  return { value: Number(match[1]), unit: unit === 'mg' ? 'mg' : ['mcg', 'µg', 'μg'].includes(unit) ? 'mcg' : 'units' };
}

/** No I/O. Fail closed, retaining raw output for audit. Expected labels never enter this function. */
export function parseScanModelOutput(raw: string): ScanResult {
  let root: Record<string, unknown> = {};
  const reasons: string[] = [];
  try {
    root = object(JSON.parse(raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1')));
  } catch { reasons.push('Invalid JSON model output.'); }
  const s = object(root.syringe), v = object(root.vial), f = object(root.fill), c = object(root.confidence);
  const confidence: Record<string, number> = {};
  for (const [key, value] of Object.entries(c)) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1) confidence[key] = value;
  }
  const check = (key: string, present: boolean) => {
    if (present && (confidence[key] === undefined || confidence[key] < SCAN_MIN_CONFIDENCE)) reasons.push(`Low or missing confidence: ${key}.`);
  };
  const volume = text(s.volume);
  const capacityMatch = volume?.match(new RegExp(`^(${DECIMAL})\\s*ml$`, 'i'));
  const capacity = capacityMatch && Number(capacityMatch[1]) > 0 && Number.isFinite(Number(capacityMatch[1])) ? Number(capacityMatch[1]) : null;
  const type = s.type === 'Insulin' || s.type === 'Standard' ? s.type : null;
  const scale = s.scale === 'U-100' || s.scale === 'U-40' || s.scale === 'mL' ? s.scale : null;
  const markings = text(s.markings);
  if (!type || capacity === null || !scale) reasons.push('Syringe type, capacity, or scale is missing or unreadable.');
  if ((type === 'Insulin' && scale !== 'U-100') || (type === 'Standard' && scale !== 'mL')) reasons.push('Unsupported or contradictory syringe scale; confirm manually.');
  const marks = markings?.split(',').map(mark => /^\d+(?:\.\d+)?$/.test(mark.trim()) ? Number(mark.trim()) : NaN) ?? [];
  if (marks.length < 2 || marks.some((mark, i) => !Number.isFinite(mark) || mark < 0 || (i > 0 && mark <= marks[i - 1]))) {
    reasons.push('Missing, garbled, or reversed syringe markings.');
  } else if (capacity !== null && scale && marks[marks.length - 1] > capacity * (scale === 'U-100' ? 100 : scale === 'U-40' ? 40 : 1)) {
    reasons.push('Syringe markings exceed stated capacity.');
  }
  for (const key of ['type', 'capacity_ml', 'scale', 'markings']) check(`syringe.${key}`, true);
  const vial = { substance: text(v.substance), totalAmount: text(v.totalAmount), concentration: text(v.concentration), expiration: text(v.expiration) };
  for (const [key, value] of Object.entries(vial)) {
    if (v[key] !== null && v[key] !== undefined && value === null) reasons.push(`Invalid vial.${key}.`);
    if (value?.toLowerCase() === 'unreadable') reasons.push(`Unreadable vial.${key}.`);
    check(`vial.${key}`, value !== null);
  }
  if (vial.totalAmount && !parseScanQuantity(vial.totalAmount)) reasons.push('Vial total amount needs an explicit readable unit.');
  if (vial.concentration && !parseScanQuantity(vial.concentration, true)) reasons.push('Vial concentration needs an explicit readable unit per mL.');
  const fill = { units: number(f.units), ml: number(f.ml), plunger_visible: typeof f.plunger_visible === 'boolean' ? f.plunger_visible : null };
  for (const key of ['units', 'ml'] as const) {
    if (f[key] !== null && f[key] !== undefined && fill[key] === null) reasons.push(`Invalid fill.${key}.`);
    check(`fill.${key}`, fill[key] !== null);
  }
  check('fill.plunger_visible', fill.plunger_visible !== null);
  if (fill.plunger_visible !== true || (fill.units === null && fill.ml === null)) reasons.push('Fill requires a visible plunger edge and a readable level.');
  if (fill.ml !== null && capacity !== null && fill.ml > capacity) reasons.push('Fill exceeds capacity.');
  if (fill.units !== null) {
    if (scale !== 'U-100' || capacity === null || fill.units > capacity * 100) reasons.push('Fill units require a readable supported U-100 scale.');
    if (fill.ml !== null && Math.abs(fill.units / 100 - fill.ml) > 1e-9) reasons.push('Contradictory fill units and mL.');
  }
  if (root.refuse !== false || root.expected_behavior === 'refuse') reasons.push(text(root.refuse_reason) || 'Model recommends refusal or did not explicitly accept the image.');
  return {
    syringe: { type, volume: capacity === null ? null : `${capacity} ml`, capacity_ml: capacity, markings, scale },
    vial, fill, confidence, refuse: reasons.length > 0, reasons, raw,
  };
}

/** Shared orchestration with an injected transport or recorded response; no network/client dependency. */
export async function readScan(image: string, source: {
  modelOutput?: string;
  complete?: (request: ReturnType<typeof buildScanRequest>) => Promise<string>;
}): Promise<ScanResult> {
  if (source.modelOutput !== undefined) return parseScanModelOutput(source.modelOutput);
  if (!source.complete) throw new Error('readScan requires a model output or injected completion transport.');
  return parseScanModelOutput(await source.complete(buildScanRequest(image)));
}

export interface ScanDoseInputs {
  manualSyringe: { type: 'Insulin' | 'Standard'; volume: string } | null;
  substance: string | null;
  concentration: number | null;
  concentrationUnit: CalculateDoseParams['concentrationUnit'] | null;
  totalAmount: number | null;
  totalAmountUnit: 'mg' | 'mcg' | 'units' | null;
}

/** Used by both form prefill and the harness. Missing facts stay null. */
export function mapScanToDoseInputs(scan: ScanResult): { status: 'ready' | 'needs-input'; reasons: string[]; inputs: ScanDoseInputs } {
  const reasons = [...scan.reasons];
  const { type, volume } = scan.syringe;
  const supported = type && volume && Object.prototype.hasOwnProperty.call(syringeOptions[type], volume);
  if (!supported) reasons.push('Confirm a supported syringe type and capacity.');
  const concentration = parseScanQuantity(scan.vial.concentration, true);
  const total = parseScanQuantity(scan.vial.totalAmount);
  const inputs: ScanDoseInputs = {
    manualSyringe: supported && type && volume ? { type, volume } : null,
    substance: scan.vial.substance,
    concentration: concentration?.value ?? null,
    concentrationUnit: concentration ? `${concentration.unit}/ml` : null,
    totalAmount: total?.value ?? null,
    totalAmountUnit: total?.unit ?? null,
  };
  // calculateDose expects totalAmount in concentration numerator units. Do not pass mismatched amounts.
  if (concentration && total && concentration.unit !== total.unit) reasons.push('Vial amount and concentration units differ; confirm manually.');
  return { status: scan.refuse || reasons.length > 0 ? 'needs-input' : 'ready', reasons, inputs };
}
