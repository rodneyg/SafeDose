import {
  adjustProtocolTime, localDateTimeFields, parseProtocolStart, ProtocolFrequency,
  translateWeeklyDose, upcomingProtocolTimes,
} from './protocolPlan';

const hour = 60 * 60 * 1000;
const u100 = { type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' } as const;
const standard = { type: 'Standard', volume: '1 ml' } as const;

describe('weekly dose translation', () => {
  it('splits twice-weekly mg and translates it to the selected syringe scale', () => {
    const result = translateWeeklyDose('150', '300', 'mg', 2, u100);
    expect(result.amount?.toString()).toBe('75');
    expect(result.volume?.toString()).toBe('0.25');
    expect(result.recommendedMarking).toBe('25');
    expect(translateWeeklyDose('150', '300', 'mg', 2, { ...u100, insulinScale: 'U-40' }).recommendedMarking).toBe('10');
  });

  it('keeps medication IU and mL separate when splitting a daily protocol', () => {
    const result = translateWeeklyDose('7', '10', 'IU', 7, standard);
    expect(result.amount?.toString()).toBe('1');
    expect(result.volume?.toString()).toBe('0.1');
    expect(result.recommendedMarking).toBe('0.1');
  });

  it('retains exact thirds through the syringe calculation', () => {
    const result = translateWeeklyDose('1', '2', 'mg', 3, u100);
    expect(result.amount?.toString()).toBe('1/3');
    expect(result.volume?.toString()).toBe('1/6');
    expect(result.recommendedMarking).toBe('50/3');
  });

  it.each([
    ['150mg', '300', u100, 'Dose value is invalid or missing.'],
    ['150', '0', u100, 'Concentration is invalid or missing.'],
    ['150', '50', standard, 'exceeds syringe capacity'],
    ['150', '20', standard, 'VOLUME_THRESHOLD_ERROR'],
  ])('refuses invalid or unmeasurable inputs %s %s', (total, concentration, syringe, error) => {
    const result = translateWeeklyDose(total, concentration, 'mg', 2, syringe);
    expect(result.calculationError).toContain(error);
    expect(result.volume).toBeNull();
    expect(result.recommendedMarking).toBeNull();
  });
});

describe('schedule preview', () => {
  const start = new Date(2026, 0, 5, 10);
  const first = start.getTime();

  it.each<[ProtocolFrequency, number]>([[1, 168], [2, 84], [3, 56], [4, 42], [5, 33.6], [6, 28], [7, 24]])(
    'derives dates from one start at %d doses per week', (frequency, interval) => {
      expect(upcomingProtocolTimes(start, frequency, {}, first - 1)).toEqual(
        [0, 1, 2, 3].map(index => ({ index, time: first + index * Math.round(interval * hour) })),
      );
    },
  );

  it('keeps weekly time local across daylight saving and daily intervals at 24 hours', () => {
    const beforeChange = new Date(2026, 2, 7, 10);
    const weekly = upcomingProtocolTimes(beforeChange, 1, {}, beforeChange.getTime());
    expect(localDateTimeFields(new Date(weekly[1].time))).toEqual({ date: '2026-03-14', time: '10:00' });
    const daily = upcomingProtocolTimes(beforeChange, 7, {}, beforeChange.getTime());
    expect(daily[1].time - daily[0].time).toBe(24 * hour);
  });

  it('preserves manual edits in upcoming results and removes them on reset', () => {
    const moved = first + 86 * hour;
    const offsets = adjustProtocolTime(start, 2, {}, 1, moved, first);
    expect(offsets).toEqual({ 1: 120 });
    expect(upcomingProtocolTimes(start, 2, offsets!, moved - 1)[0]).toEqual({ index: 1, time: moved });
    expect(upcomingProtocolTimes(start, 2, {}, moved - 1)[0]).toEqual({ index: 2, time: first + 168 * hour });
    expect(adjustProtocolTime(start, 2, offsets!, 1, first + 84 * hour, first)).toEqual({});
  });

  it('rejects changes to the first dose, collisions, and past moves', () => {
    expect(adjustProtocolTime(start, 2, {}, 0, first, first)).toBeNull();
    expect(adjustProtocolTime(start, 2, { 2: -120 }, 1, first + 166 * hour, first)).toBeNull();
    expect(adjustProtocolTime(start, 2, {}, 1, first + 84 * hour, first + 85 * hour)).toBeNull();
  });

  it('accepts only minute-aligned schedule edits', () => {
    const minute = 60 * 1000;
    expect(adjustProtocolTime(start, 2, {}, 1, first + 85 * hour + minute, first)).toEqual({ 1: 61 });
    expect(adjustProtocolTime(start, 2, {}, 1, first + 85 * hour + 1, first)).toBeNull();
  });

  it.each([['2026-02-30', '10:00'], ['2026-02-24', '24:00'], ['2026-2-24', '10:00']])(
    'rejects invalid dates or times %s %s', (date, time) => {
      expect(parseProtocolStart(date, time)).toBeNull();
    },
  );

  it('accepts a leap day with a minute-level time', () => {
    expect(parseProtocolStart('2028-02-29', '23:59')).toEqual(new Date(2028, 1, 29, 23, 59));
  });
});
