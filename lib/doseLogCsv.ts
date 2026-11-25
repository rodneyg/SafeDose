import { DoseLog } from '../types/doseLog';
import { INJECTION_SITES } from './injectionSites';

export const DOSE_LOG_CSV_HEADER = ['date', 'substance', 'dose', 'unit', 'syringe', 'injection site', 'notes'];

const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * Make one value safe for a CSV cell. Cells that start with = + - @ (or a tab or
 * carriage return) get a leading apostrophe so spreadsheets do not run them as formulas.
 * Cells with commas, quotes or line breaks are wrapped in quotes.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function siteLabel(site: DoseLog['injectionSite']): string {
  if (!site) return '';
  return INJECTION_SITES.find((s) => s.id === site)?.label ?? String(site);
}

function dateText(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function buildDoseLogCsv(logs: DoseLog[]): string {
  const rows = logs.map((log) =>
    [dateText(log.timestamp), log.substanceName, log.doseValue, log.unit, log.syringeType, siteLabel(log.injectionSite), log.notes]
      .map(escapeCsvCell)
      .join(',')
  );
  return [DOSE_LOG_CSV_HEADER.join(','), ...rows].join('\r\n') + '\r\n';
}

export function doseLogCsvFileName(now: Date = new Date()): string {
  return `safedose-dose-log-${now.toISOString().slice(0, 10)}.csv`;
}
