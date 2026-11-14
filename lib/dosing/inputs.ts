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
