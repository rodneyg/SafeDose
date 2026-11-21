import { scheduleProtocol } from '../protocolScheduler';

describe('scheduleProtocol', () => {
  const protocol = [
    { day: 1, dose: '2 mg' },
    { day: 8, dose: '4 mg' },
  ];

  it('clears dates when an existing schedule loses its start date', () => {
    const scheduled = scheduleProtocol(protocol, '2026-03-07');

    expect(scheduleProtocol(scheduled, null)).toStrictEqual(protocol);
    expect(scheduled.map(({ date }) => date)).toEqual(['2026-03-07', '2026-03-14']);
  });

  it.each([undefined, null])('returns fresh undated entries with a %s start date', (startDate) => {
    const scheduled = scheduleProtocol(protocol, startDate);

    expect(scheduled).toStrictEqual(protocol);
    scheduled.forEach((entry, index) => {
      expect(entry).not.toBe(protocol[index]);
    });
  });

  it('translates protocol days without timezone-dependent parsing', () => {
    expect(scheduleProtocol(protocol, '2026-03-07')).toEqual([
      { day: 1, dose: '2 mg', date: '2026-03-07' },
      { day: 8, dose: '4 mg', date: '2026-03-14' },
    ]);
  });

  it.each([
    ['2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29'],
  ])('schedules day two from %s on %s', (startDate, date) => {
    expect(scheduleProtocol([{ day: 2, dose: 1 }], startDate)).toEqual([{ day: 2, dose: 1, date }]);
  });

  it('rejects invalid date-only input', () => {
    expect(() => scheduleProtocol(protocol, '2026-02-30')).toThrow(
      'Start date must be a valid calendar date.',
    );
    expect(() => scheduleProtocol(protocol, '03/07/2026')).toThrow(
      'Start date must use YYYY-MM-DD format.',
    );
  });

  it.each([
    ['0000-01-01', 1, '0000-01-01'],
    ['0099-12-31', 2, '0100-01-01'],
    ['9999-12-30', 2, '9999-12-31'],
  ])('keeps four-digit calendar years from %s on day %i', (startDate, day, date) => {
    expect(scheduleProtocol([{ day, dose: 1 }], startDate)).toEqual([{ day, dose: 1, date }]);
  });

  it.each([
    ['9999-12-31', 2],
    ['2026-01-01', Number.MAX_SAFE_INTEGER],
  ])('rejects out-of-range results from %s on day %i', (startDate, day) => {
    expect(() => scheduleProtocol([{ day, dose: 1 }], startDate)).toThrow(
      new RangeError('Scheduled date is outside the YYYY-MM-DD range.'),
    );
  });

  it.each([-1, 0, 1.5])('rejects invalid protocol day %s when scheduling', (day) => {
    expect(() => scheduleProtocol([{ day, dose: protocol[0].dose }], '2026-03-07')).toThrow(
      'Protocol days must be positive whole numbers.',
    );
  });
});
