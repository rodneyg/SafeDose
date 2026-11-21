import type { DoseLog } from '../../../types/doseLog';
import { suggestProtocolReview } from '../protocolReview';

describe('suggestProtocolReview', () => {
  const protocol = Object.freeze([Object.freeze({ day: 1, dose: 'fixture' })]);
  const doseLog: DoseLog = {
    id: 'fixture-log',
    substanceName: 'Fixture',
    doseValue: 0,
    unit: 'mg',
    calculatedVolume: 0,
    timestamp: '2026-01-01T00:00:00.000Z',
  };
  const doseLogs = Object.freeze([Object.freeze(doseLog)]);

  it('returns no suggestion when both sets of records are empty', () => {
    expect(suggestProtocolReview({ protocol: [], doseLogs: [] })).toEqual({ kind: 'none' });
  });

  it('returns no suggestion without a protocol', () => {
    expect(suggestProtocolReview({ protocol: [], doseLogs })).toEqual({ kind: 'none' });
  });

  it('returns no suggestion without dose logs', () => {
    expect(suggestProtocolReview({ protocol, doseLogs: [] })).toEqual({ kind: 'none' });
  });

  it('suggests reviewing existing records when both are present', () => {
    expect(suggestProtocolReview({ protocol, doseLogs })).toEqual({ kind: 'review-records' });
  });
});
