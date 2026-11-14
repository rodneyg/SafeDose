import { Exact } from './exact';
import { SyringeSelection } from './syringes';
export type AmountUnit = 'mg' | 'mcg' | 'units';
export type ConcentrationUnit = 'mg/ml' | 'mcg/ml' | 'units/ml';
export type InputResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Accept plain decimals or unambiguous groups of three. Never parse numeric prefixes. */
export function parseInputNumber(text: string): number {
  const value = text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(value)) return NaN;
  const number = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(number)) return NaN;
  // Refuse a decimal that would lose digits when crossing the numeric API boundary.
  return new Exact(value.replace(/,/g, '')).compare(new Exact(number)) === 0 ? number : NaN;
}

export function normalizeAmountUnit(text: string): AmountUnit | null {
  const unit = text.replace(/\s/g, '').toLowerCase().replace(/[µμ]/g, 'u');
  if (unit === 'mg') return 'mg';
  if (unit === 'mcg' || unit === 'ug') return 'mcg';
  if (unit === 'units' || unit === 'u') return 'units';
  return null;
}

export function parseScannedAmount(text: string): InputResult<{ amount: number; unit: AmountUnit }> {
  const match = text.trim().match(/^([+\-\d.,]+)\s*(.*)$/);
  const amount = match ? parseInputNumber(match[1]) : NaN;
  const unit = match ? normalizeAmountUnit(match[2]) : null;
  if (!Number.isFinite(amount) || amount <= 0 || !unit) {
    return { ok: false, error: 'Needs input: enter a valid total amount and select its unit (mg, mcg, or units).' };
  }
  return { ok: true, value: { amount, unit } };
}

export function parsePlannerPrefill(params: { prefillTotalAmount?: string; prefillTotalUnit?: string; prefillSolutionVolume?: string; prefillConcentrationExact?: string }): InputResult<{ totalAmount: number; totalAmountUnit: AmountUnit; concentrationUnit: ConcentrationUnit; solutionVolume: string; concentrationExact?: string }> {
  const amount = parseScannedAmount(`${params.prefillTotalAmount || ''} ${params.prefillTotalUnit || ''}`);
  if (!amount.ok) return amount;
  if (!(parseInputNumber(params.prefillSolutionVolume || '') > 0)) {
    return { ok: false, error: 'Needs input: enter the solution volume in mL.' };
  }
  return { ok: true, value: {
    concentrationExact: params.prefillConcentrationExact,
    totalAmount: amount.value.amount, totalAmountUnit: amount.value.unit,
    concentrationUnit: `${amount.value.unit}/ml`, solutionVolume: params.prefillSolutionVolume!,
  } };
}

export function parsePlannerScan(vial: { totalAmount?: string | null; concentration?: string | null }): InputResult<{ amount: number; unit: 'mg' | 'mcg' }> {
  const amount = parseScannedAmount(vial.totalAmount || '');
  if (!amount.ok) return amount;
  if (amount.value.unit === 'units') {
    return { ok: false, error: 'Needs input: the planner requires a vial amount in mg or mcg, not concentration or medication units.' };
  }
  return { ok: true, value: { amount: amount.value.amount, unit: amount.value.unit } };
}

export function parseScannedConcentration(text: string): InputResult<{ amount: number; unit: ConcentrationUnit }> {
  const normalized = text.trim().replace(/\s*\/\s*/g, '/');
  const match = normalized.match(/^([+\-\d.,]+)\s*(.+)\/ml$/i);
  const amount = match ? parseInputNumber(match[1]) : NaN;
  const numerator = match ? normalizeAmountUnit(match[2]) : null;
  if (!Number.isFinite(amount) || amount <= 0 || !numerator) {
    return { ok: false, error: 'Needs input: enter a valid concentration and select mg/mL, mcg/mL, or units/mL. Unknown units are not supported.' };
  }
  return { ok: true, value: { amount, unit: `${numerator}/ml` } };
}

export function parseScannedSyringe(scan: { type?: string | null; volume?: string | null; scale?: string | null }, selectedScale = 'U-100'): InputResult<SyringeSelection> {
  const type = scan.type?.trim().toLowerCase();
  const normalizedType = type === 'insulin' ? 'Insulin' : type === 'standard' ? 'Standard' : null;
  const volume = scan.volume?.replace(/\s/g, '').toLowerCase();
  if (!normalizedType || !volume) return { ok: false, error: 'Needs input: select the syringe type and volume from its label.' };
  const volumes = normalizedType === 'Insulin' ? ['0.3 ml', '0.5 ml', '1 ml'] : ['1 ml', '3 ml', '5 ml'];
  const selected = volumes.find(option => option.replace(/\s/g, '') === volume);
  if (!selected) return { ok: false, error: 'Needs input: select a supported syringe volume from its label.' };
  if (normalizedType === 'Insulin') {
    const scale = scan.scale?.replace(/\s/g, '').toUpperCase();
    if (!scale || !['U-100', 'U-40'].includes(scale)) {
      return { ok: false, error: 'Needs input: confirm the insulin scale. Only U-100 and U-40 are supported.' };
    }
    if (scale !== selectedScale) return { ok: false, error: `Needs input: scanned ${scale} conflicts with selected ${selectedScale}. Select the scale printed on your syringe.` };
    if (scale === 'U-40' && selected === '0.3 ml') return { ok: false, error: 'Needs input: U-40 supports 0.5 mL and 1 mL syringes only.' };
    return { ok: true, value: { type: normalizedType, volume: selected, insulinScale: scale } };
  }
  return { ok: true, value: { type: normalizedType, volume: selected } };
}
