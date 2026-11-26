import {
  parseLocalDateTimeInput,
  resolveDoseTimestamp,
  sortLogsNewestFirst,
} from '../doseLogTimestamp';

const now = new Date('2026-11-24T12:00:00.000Z');

describe('resolveDoseTimestamp', () => {
  it('uses now when no time is given', () => {
    expect(resolveDoseTimestamp(undefined, now)).toEqual({ ok: true, iso: now.toISOString() });
    expect(resolveDoseTimestamp('', now)).toEqual({ ok: true, iso: now.toISOString() });
  });

  it('keeps an earlier time as the log timestamp', () => {
    expect(resolveDoseTimestamp('2026-11-23T08:30:00.000Z', now)).toEqual({
      ok: true,
      iso: '2026-11-23T08:30:00.000Z',
    });
  });

  it('rejects a future time', () => {
    expect(resolveDoseTimestamp('2026-11-24T13:00:00.000Z', now)).toEqual({ ok: false, reason: 'future' });
  });

  it('never saves a time past now when inside the clock slack', () => {
    const r = resolveDoseTimestamp('2026-11-24T12:00:30.000Z', now);
    expect(r).toEqual({ ok: true, iso: now.toISOString() });
  });

  it('allows exactly 30 days back and rejects older', () => {
    expect(resolveDoseTimestamp('2026-10-25T12:00:00.000Z', now).ok).toBe(true);
    expect(resolveDoseTimestamp('2026-10-25T11:59:00.000Z', now)).toEqual({ ok: false, reason: 'too_old' });
  });

  it('rejects text that is not a date', () => {
    expect(resolveDoseTimestamp('not a date', now)).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('parseLocalDateTimeInput', () => {
  it('treats blank as now', () => {
    expect(parseLocalDateTimeInput('   ')).toBeUndefined();
  });

  it('parses local date and time', () => {
    const iso = parseLocalDateTimeInput('2026-11-23 08:30');
    expect(iso).toBe(new Date(2026, 10, 23, 8, 30).toISOString());
  });

  it('returns null for bad or impossible input', () => {
    expect(parseLocalDateTimeInput('11/23/2026')).toBeNull();
    expect(parseLocalDateTimeInput('2026-02-31 08:30')).toBeNull();
    expect(parseLocalDateTimeInput('2026-11-23 25:00')).toBeNull();
  });
});

describe('sortLogsNewestFirst', () => {
  it('orders by timestamp so a backdated log sits in its place', () => {
    const logs = [
      { id: 'newest', timestamp: '2026-11-24T10:00:00.000Z' },
      { id: 'backdated', timestamp: '2026-11-22T09:00:00.000Z' },
      { id: 'middle', timestamp: '2026-11-23T09:00:00.000Z' },
    ];
    const sorted = sortLogsNewestFirst(logs);
    expect(sorted.map((l) => l.id)).toEqual(['newest', 'middle', 'backdated']);
    expect(logs[0].id).toBe('newest'); // input not mutated
  });
});
