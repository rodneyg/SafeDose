import { Exact } from './exact';

/** The log fields that describe the vial a dose came from. */
export interface VialSupplyLog {
  substanceName?: string;
  doseValue: number;
  unit: string;
  timestamp: string;
  medicationInputType?: 'concentration' | 'totalAmount' | null;
  totalAmount?: string;
  totalAmountUnit?: 'mg' | 'mcg' | 'units';
}

export interface VialSupplyEstimate {
  /** Whole doses left at the most recent dose size, never below 0. */
  dosesLeft: number;
  /** Exact amount left in the vial, in the vial's own unit, as an exact string. */
  amountLeftExact: string;
  vialUnit: 'mg' | 'mcg' | 'units';
  loggedDoseCount: number;
}

const MASS_UNITS = ['mg', 'mcg'];

/** Convert an amount to the vial unit, or null when the units cannot be compared. */
function toVialUnit(value: string | number, from: string, vialUnit: string): Exact | null {
  if (from === vialUnit) return new Exact(value);
  if (MASS_UNITS.includes(from) && MASS_UNITS.includes(vialUnit)) {
    return from === 'mg' ? new Exact(value).mul(1000) : new Exact(value).div(1000);
  }
  return null;
}

function parsePositive(text: string | undefined): Exact | null {
  if (!text) return null;
  try {
    const value = new Exact(text.trim());
    return value.compare(0) > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Two logs share a vial when the vial label inputs and substance match. */
function sameVial(a: VialSupplyLog, b: VialSupplyLog): boolean {
  const totalB = parsePositive(b.totalAmount);
  return (a.substanceName || '').trim().toLowerCase() === (b.substanceName || '').trim().toLowerCase()
    && a.totalAmountUnit === b.totalAmountUnit
    && !!totalB && parsePositive(a.totalAmount)!.compare(totalB) === 0;
}

/**
 * Estimate how many doses are left in the most recent vial.
 * Logs are newest first. Needs a total amount saved with the log; returns null otherwise.
 * It subtracts every logged dose that shares the newest log's substance and vial total,
 * so a second vial with the same label counts as one vial. It is an estimate only.
 */
export function estimateVialSupply(logs: VialSupplyLog[]): VialSupplyEstimate | null {
  const latest = logs[0];
  if (!latest || latest.medicationInputType !== 'totalAmount' || !latest.totalAmountUnit) return null;
  const total = parsePositive(latest.totalAmount);
  if (!total) return null;
  const vialUnit = latest.totalAmountUnit;

  let used = new Exact(0);
  let count = 0;
  for (const log of logs) {
    if (log.medicationInputType !== 'totalAmount' || !sameVial(latest, log)) continue;
    const dose = toVialUnit(log.doseValue, log.unit, vialUnit);
    if (!dose || dose.compare(0) <= 0) return null;
    used = new Exact(String(used.n * dose.d + dose.n * used.d), used.d * dose.d);
    count++;
  }

  // The newest log is part of the loop above, so its dose is already known to be valid.
  const latestDose = toVialUnit(latest.doseValue, latest.unit, vialUnit)!;

  const diff = new Exact(String(total.n * used.d - used.n * total.d), total.d * used.d);
  const left = diff.compare(0) < 0 ? new Exact(0) : diff;
  const doses = left.div(latestDose);
  const dosesLeft = Number(doses.n / doses.d); // exact floor, operands are non-negative
  return { dosesLeft, amountLeftExact: left.toString(), vialUnit, loggedDoseCount: count };
}
