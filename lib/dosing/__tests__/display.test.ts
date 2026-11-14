import { parseDoseInput, formatDoseNumber, concentrationFromDose, formatConcentration, formatDrawToText } from '..';

it('keeps numeric prefix parsing', () => {
  expect(parseDoseInput('2.5 mg')).toBe(2.5);
  expect(parseDoseInput('')).toBeNaN();
  expect(parseDoseInput('Infinity')).toBe(Infinity);
});
it('keeps fixed decimal formatting and planner handoff rounding', () => {
  expect(formatDoseNumber(0.12345, 2)).toBe('0.12');
  expect(formatDoseNumber(2, 3)).toBe('2.000');
  expect(concentrationFromDose(200, 1)).toBe(200);
});
it('formats marking logs', () => {
  expect(formatDrawToText({})).toBeNull();
  expect(formatDrawToText({ recommendedMarking: '10' })).toBeNull();
  expect(formatDrawToText({ recommendedMarking: '10', syringeType: 'Insulin' })).toBe('Draw to 10.00 units');
  expect(formatDrawToText({ recommendedMarking: '0.125', syringeType: 'Standard' })).toBe('Draw to 0.13 ml');
});
it('formats log concentration with original precision and suffixes', () => {
  expect(formatConcentration(1, 'mL', 1)).toBeNull();
  expect(formatConcentration(1, 'mg', 0)).toBeNull();
  expect(formatConcentration(1, 'mg', -1)).toBeNull();
  expect(formatConcentration(1, 'mg', 2)).toBe('0.5 mg/mL');
  expect(formatConcentration(200, 'mg', 1)).toBe('200 mg/mL');
  expect(formatConcentration(10, 'units', 1)).toBe('10 units/mL');
  expect(formatConcentration(1, 'mcg', 3)).toBe('0.333 mcg/mL');
});
