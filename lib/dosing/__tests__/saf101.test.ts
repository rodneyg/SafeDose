import * as dosing from '..';
import { CalculateDoseParams } from '..';

const syringe = { type: 'Insulin' as const, volume: '1 ml' };
const vialProbe = {
  doseValue: 250, unit: 'mcg', concentration: null, concentrationUnit: 'mg/ml',
  totalAmount: 5000, totalAmountUnit: 'mcg', solutionVolume: '2', manualSyringe: syringe,
} as CalculateDoseParams;

it('SAF-101 #1: scanned mcg vial retains its unit through concentration calculation', () => {
  const result = dosing.calculateDose(vialProbe);
  expect(result.calculatedVolume).toBe(0.1);
  expect(result.recommendedMarking).toBe('10');
});

it('SAF-101 #2: planner prefill applies mcg vial unit', () => {
  const prefill = dosing.parsePlannerPrefill({ prefillTotalAmount: '5000', prefillTotalUnit: 'mcg', prefillSolutionVolume: '2' });
  expect(prefill.ok).toBe(true);
  if (!prefill.ok) throw new Error(prefill.error);
  expect(prefill.value.totalAmountUnit).toBe('mcg');
  expect(dosing.calculateDose({ ...vialProbe, ...prefill.value }).recommendedMarking).toBe('10');
});

it('SAF-101 #3: planner scan refuses concentration and parses thousands with units', () => {
  expect(dosing.parsePlannerScan({ concentration: '5 mg/mL' }).ok).toBe(false);
  expect(dosing.parsePlannerScan({ totalAmount: '1,000 mcg' })).toEqual({ ok: true, value: { amount: 1000, unit: 'mcg' } });
});

it('SAF-101 #4: planner handoff preserves exact target concentration', () => {
  const plan = dosing.calculateReconstitution({ peptideAmountMg: 10, targetDoseMg: 0.3, preferredVolumeMl: 0.1 });
  const handoff = dosing.getPlannerHandoff(plan);
  const result = dosing.calculateDose({ ...vialProbe, doseValue: 300, totalAmount: 10, totalAmountUnit: 'mg', ...handoff });
  expect(result.calculatedVolume).toBe(0.1);
  expect(result.recommendedMarking).toBe('10');
});

it('SAF-101 #5: exact marking and stored log contain 29 without float noise', () => {
  const result = dosing.calculateDose({ ...vialProbe, doseValue: 0.29, unit: 'mg', concentration: 1, totalAmount: null });
  expect(result.recommendedMarking).toBe('29');
  expect(dosing.formatDrawToText({ recommendedMarking: result.recommendedMarking!, syringeType: 'Insulin' })).toBe('Draw to 29.00 units');
  expect(dosing.calculateDose({ ...vialProbe, unit: 'mL', doseValue: 0.5, totalAmount: null, concentration: null }).recommendedMarking).toBe('50');
});
