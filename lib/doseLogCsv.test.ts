import { buildDoseLogCsv, escapeCsvCell, doseLogCsvFileName, DOSE_LOG_CSV_HEADER } from './doseLogCsv';
import { DoseLog } from '../types/doseLog';

const base: DoseLog = {
  id: '1',
  substanceName: 'Semaglutide',
  doseValue: 0.25,
  unit: 'mg',
  calculatedVolume: 0.1,
  syringeType: 'Insulin',
  injectionSite: 'abdomen_L',
  timestamp: '2026-11-20T15:30:00.000Z',
  notes: 'felt fine',
};

describe('escapeCsvCell', () => {
  it('leaves plain text alone and blanks empty values', () => {
    expect(escapeCsvCell('abc')).toBe('abc');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell('')).toBe('');
  });
  it('quotes commas, quotes and line breaks', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('one\ntwo')).toBe('"one\ntwo"');
  });
  it.each(['=1+1', '+5', '-2', '@SUM(A1)', '\tx'])('guards formula start %p', (v) => {
    expect(escapeCsvCell(v).startsWith("'") || escapeCsvCell(v).startsWith('"\'')).toBe(true);
  });
  it('guards and quotes together', () => {
    expect(escapeCsvCell('=HYPERLINK("x","y")')).toBe('"\'=HYPERLINK(""x"",""y"")"');
  });
});

describe('buildDoseLogCsv', () => {
  it('writes the header and one row per log', () => {
    const csv = buildDoseLogCsv([base]);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toBe(DOSE_LOG_CSV_HEADER.join(','));
    expect(lines[1]).toBe('2026-11-20T15:30:00.000Z,Semaglutide,0.25,mg,Insulin,Abdomen Left,felt fine');
  });
  it('leaves empty fields blank', () => {
    const csv = buildDoseLogCsv([{ ...base, syringeType: undefined, injectionSite: undefined, notes: undefined }]);
    expect(csv.trim().split('\r\n')[1]).toBe('2026-11-20T15:30:00.000Z,Semaglutide,0.25,mg,,,');
  });
  it('handles commas, quotes and formula notes in a row', () => {
    const csv = buildDoseLogCsv([{ ...base, substanceName: 'BPC, 157', notes: '=cmd|"x"' }]);
    expect(csv).toContain('"BPC, 157"');
    expect(csv).toContain('"\'=cmd|""x"""');
  });
  it('gives only the header for no logs and blanks a bad date', () => {
    expect(buildDoseLogCsv([])).toBe(DOSE_LOG_CSV_HEADER.join(',') + '\r\n');
    expect(buildDoseLogCsv([{ ...base, timestamp: 'nope' }])).toContain('\r\n,Semaglutide');
  });
});

describe('doseLogCsvFileName', () => {
  it('uses the date', () => {
    expect(doseLogCsvFileName(new Date('2026-11-24T10:00:00Z'))).toBe('safedose-dose-log-2026-11-24.csv');
  });
});
