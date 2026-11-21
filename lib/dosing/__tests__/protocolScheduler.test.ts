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

  it.each([-1, 0, 1.5])('rejects invalid protocol day %s when scheduling', (day) => {
    expect(() => scheduleProtocol([{ day, dose: protocol[0].dose }], '2026-03-07')).toThrow(
      'Protocol days must be positive whole numbers.',
    );
  });
});
