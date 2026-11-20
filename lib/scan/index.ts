import { syringeOptions, type CalculateDoseParams } from '../dosing';
import { SCAN_MODEL, SCAN_PROMPT, buildScanRequest } from './request';

// Snapshot rather than the moving gpt-4o alias. No client or credentials live here.
export { SCAN_MODEL, SCAN_PROMPT, buildScanRequest };
export const SCAN_MIN_CONFIDENCE = 0.9;

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
  // Preserve raw fill for evaluation. Validation can reject it, but confidence cannot verify it.
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

/** Map syringe metadata and vial label fields. Model fill and its confidence are never dose inputs. */
export function mapScanToDoseInputs(
  scan: ScanResult,
  { syringeAndVialVerified = false }: { syringeAndVialVerified?: boolean } = {},
): { status: 'ready' | 'needs-input' | 'needs-verification'; reasons: string[]; inputs: ScanDoseInputs } {
  const reasons = [...scan.reasons];
  const { type, volume } = scan.syringe;
  const supported = type && volume && Object.prototype.hasOwnProperty.call(syringeOptions[type], volume);
  if (!supported) reasons.push('Confirm a supported syringe type and capacity.');
  const trusted = (key: string) => scan.confidence[key] >= SCAN_MIN_CONFIDENCE;
  const concentration = trusted('vial.concentration') ? parseScanQuantity(scan.vial.concentration, true) : null;
  const total = trusted('vial.totalAmount') ? parseScanQuantity(scan.vial.totalAmount) : null;
  if (!concentration && !total) reasons.push('Vial strength is missing or unreadable.');
  const inputs: ScanDoseInputs = {
    manualSyringe: supported && ['type', 'capacity_ml', 'scale', 'markings'].every(key => trusted(`syringe.${key}`)) && type && volume ? { type, volume } : null,
    substance: trusted('vial.substance') ? scan.vial.substance : null,
    concentration: concentration?.value ?? null,
    concentrationUnit: concentration ? `${concentration.unit}/ml` : null,
    totalAmount: total?.value ?? null,
    totalAmountUnit: total?.unit ?? null,
  };
  // calculateDose expects totalAmount in concentration numerator units. Do not pass mismatched amounts.
  if (concentration && total && concentration.unit !== total.unit) reasons.push('Vial amount and concentration units differ; confirm manually.');
  if (scan.refuse || reasons.length > 0) return { status: 'needs-input', reasons, inputs };
  return { status: syringeAndVialVerified ? 'ready' : 'needs-verification', reasons, inputs };
}
