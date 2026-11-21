import type { DoseLog } from '../../../types/doseLog';
import { suggestProtocolReview } from '../protocolReview';

describe('suggestProtocolReview', () => {
  const protocol = Object.freeze([Object.freeze({ day: 1, dose: 'fixture' })]);
  const doseLog: DoseLog = {
    id: 'fixture-log',
    substanceName: ' fixture ',
    doseValue: 0,
    unit: 'mg',
    calculatedVolume: 0,
    timestamp: '2026-01-01T00:00:00.000Z',
  };
  const doseLogs = Object.freeze([Object.freeze(doseLog)]);
  const protocolCompound = 'Fixture';

  it('returns no suggestion when both sets of records are empty', () => {
    expect(suggestProtocolReview({ protocolCompound, protocol: [], doseLogs: [] })).toEqual({ kind: 'none' });
  });

  it('returns no suggestion without a protocol', () => {
    expect(suggestProtocolReview({ protocolCompound, protocol: [], doseLogs })).toEqual({ kind: 'none' });
  });

  it('returns no suggestion without dose logs', () => {
    expect(suggestProtocolReview({ protocolCompound, protocol, doseLogs: [] })).toEqual({ kind: 'none' });
  });

  it.each(['  ', ' Unknown '])('ignores a placeholder compound name %j', (name) => {
    expect(suggestProtocolReview({
      protocolCompound: name,
      protocol,
      doseLogs: [{ substanceName: name }],
    })).toEqual({ kind: 'none' });
  });

  it('returns no suggestion when only a different compound was logged', () => {
    expect(suggestProtocolReview({
      protocolCompound,
      protocol,
      doseLogs: [{ substanceName: 'Fixture Plus' }],
    })).toEqual({ kind: 'none' });
  });

  it('suggests record review when a name matches after trimming and case folding', () => {
    expect(suggestProtocolReview({
      protocolCompound: ' FIXTURE ',
      protocol,
      doseLogs: [{ substanceName: 'Fixture Plus' }, ...doseLogs],
    })).toEqual({ kind: 'review-records' });
  });

  it('ignores a legacy log with a missing name', () => {
    expect(suggestProtocolReview({ protocolCompound, protocol, doseLogs: [{}] }))
      .toEqual({ kind: 'none' });
  });
});
