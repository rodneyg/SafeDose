export type AmountUnit = 'mg' | 'mcg' | 'units';
export type ConcentrationUnit = 'mg/ml' | 'mcg/ml' | 'units/ml';
export type InputResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Accept plain decimals or unambiguous groups of three. Never parse numeric prefixes. */
export function parseInputNumber(text: string): number {
  const value = text.trim();
  if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/.test(value)) return NaN;
  const number = Number(value.replace(/,/g, ''));
  return Number.isFinite(number) ? number : NaN;
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
