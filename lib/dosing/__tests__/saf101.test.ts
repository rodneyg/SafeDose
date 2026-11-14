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
