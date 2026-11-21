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

  it('is a no-op when a start date is not supplied', () => {
    expect(scheduleProtocol(protocol)).toEqual(protocol);
    expect(scheduleProtocol(protocol, null)).toEqual(protocol);
  });

  it('translates protocol days without timezone-dependent parsing', () => {
    expect(scheduleProtocol(protocol, '2026-03-07')).toEqual([
      { day: 1, dose: '2 mg', date: '2026-03-07' },
      { day: 8, dose: '4 mg', date: '2026-03-14' },
    ]);
  });

  it('handles month and year boundaries as calendar dates', () => {
    expect(scheduleProtocol([{ day: 2, dose: 1 }], '2026-12-31')).toEqual([
      { day: 2, dose: 1, date: '2027-01-01' },
    ]);
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

  describe('with a frozen clock', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2035-06-15T23:59:59.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('schedules the first date and the next protocol fire from the selected date', () => {
      expect(scheduleProtocol(protocol, '2026-11-20')).toEqual([
        { day: 1, dose: '2 mg', date: '2026-11-20' },
        { day: 8, dose: '4 mg', date: '2026-11-27' },
      ]);
    });

    it('cancels optional scheduling when the selected date is cleared', () => {
      const cancelled = scheduleProtocol(protocol, null);

      expect(cancelled).toEqual(protocol);
      expect(cancelled).not.toBe(protocol);
      expect(cancelled[0]).not.toBe(protocol[0]);
      expect(cancelled.every((entry) => entry.date === undefined)).toBe(true);
    });
  });
});
