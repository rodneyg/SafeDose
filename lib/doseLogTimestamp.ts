/** Helpers for the optional "when did you take it" time on a dose log. */

export const BACKDATE_LIMIT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
// Small allowance so a time picked as "now" is not rejected by clock drift.
const FUTURE_SLACK_MS = 60 * 1000;

export type TimestampResult =
  | { ok: true; iso: string }
  | { ok: false; reason: 'invalid' | 'future' | 'too_old' };

/** Turns an optional user time into a log timestamp. No time means now. */
export function resolveDoseTimestamp(loggedAt: string | null | undefined, now: Date = new Date()): TimestampResult {
  if (loggedAt === undefined || loggedAt === null || loggedAt === '') {
    return { ok: true, iso: now.toISOString() };
  }
  const at = new Date(loggedAt);
  const ms = at.getTime();
  if (Number.isNaN(ms)) return { ok: false, reason: 'invalid' };
  if (ms > now.getTime() + FUTURE_SLACK_MS) return { ok: false, reason: 'future' };
  if (ms < now.getTime() - BACKDATE_LIMIT_DAYS * DAY_MS) return { ok: false, reason: 'too_old' };
  // A time inside the slack window is saved as now so it is never in the future.
  return { ok: true, iso: new Date(Math.min(ms, now.getTime())).toISOString() };
}

/**
 * Parses text typed as "YYYY-MM-DD HH:MM" (device local time) into an ISO string.
 * Empty text means "now" and returns undefined. Unparseable text returns null.
 */
export function parseLocalDateTimeInput(text: string): string | undefined | null {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  const sane = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
    && date.getHours() === h && date.getMinutes() === mi;
  return sane ? date.toISOString() : null;
}

export function timestampErrorMessage(reason: 'invalid' | 'future' | 'too_old'): string {
  switch (reason) {
    case 'future': return 'The time cannot be in the future.';
    case 'too_old': return `You can log a dose from the last ${BACKDATE_LIMIT_DAYS} days.`;
    default: return 'Enter the time as YYYY-MM-DD HH:MM, for example 2026-11-23 08:30.';
  }
}

/** Newest first by timestamp. Returns a new array. */
export function sortLogsNewestFirst<T extends { timestamp: string }>(logs: T[]): T[] {
  return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
