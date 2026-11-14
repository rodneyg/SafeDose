import * as fc from 'fast-check';
import {
  calculateDose, CalculateDoseParams, CalculateDoseResult, calculateReconstitution,
  formatDoseNumber, formatDrawToText, getMarkingGuidance, getPlannerHandoff, getSyringeMarkings, parseInputNumber,
  SyringeSelection,
} from '..';
import { Exact } from '../exact';

const NUM_RUNS = 1000;
const seed = process.env.FC_SEED === undefined ? 1032026 : Number(process.env.FC_SEED);
if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647) {
  throw new Error('FC_SEED must be a signed 32-bit integer.');
}
if (process.env.FC_PATH && !process.env.FC_PROPERTY) {
  throw new Error('Set FC_PROPERTY with FC_PATH to replay only the failing property.');
}
let totalRuns = 0;
let totalProperties = 0;
const propertyNames: string[] = [];

function property<T extends [unknown, ...unknown[]]>(name: string, invariant: fc.IProperty<T>) {
  propertyNames.push(name);
  const run = process.env.FC_PROPERTY && process.env.FC_PROPERTY !== name ? it.skip : it;
  run(name, () => {
    const details = fc.check(invariant, { numRuns: NUM_RUNS, seed, path: process.env.FC_PATH });
    totalRuns += details.numRuns;
    totalProperties++;
    if (details.failed) {
      throw new Error([
        `Property failed: ${name}; seed=${details.seed}; path=${details.counterexamplePath}`,
        `Counterexample: ${fc.stringify(details.counterexample)}`,
        `Replay: FC_SEED=${details.seed} FC_PROPERTY='${name}' FC_PATH='${details.counterexamplePath}' npm test -- --runInBand lib/dosing/__tests__/properties.test.ts`,
        String(details.errorInstance),
      ].join('\n'));
    }
    // A normal run must execute all cases, with no precondition skips.
    if (!process.env.FC_PATH) expect(details.numRuns).toBe(NUM_RUNS);
    expect(details.numSkips).toBe(0);
  });
}

afterAll(() => {
  if (process.env.FC_PROPERTY && !propertyNames.includes(process.env.FC_PROPERTY)) {
    throw new Error(`Unknown FC_PROPERTY: ${process.env.FC_PROPERTY}`);
  }
  console.info(`SAF-103: ${totalRuns} property runs across ${totalProperties} properties; FC_SEED=${seed}`);
});

// Generate the short decimal strings users type, without binary floating-point arithmetic.
function decimal(value: number, places: number): string {
  const digits = String(value).padStart(places + 1, '0');
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, '');
}
const enteredDecimal = (min: number, max: number, places: number) =>
  fc.integer({ min, max }).map(value => decimal(value, places));
const doseMicros = fc.oneof(fc.constantFrom(1, 5, 100, 250, 1000, 2000000), fc.integer({ min: 1, max: 2000000 }));
const concentrationMilli = fc.oneof(fc.constantFrom(10, 100, 1000, 2500, 200000, 10000000), fc.integer({ min: 10, max: 10000000 }));
// Both operands have three decimal places, so their ratio is doseMicros/concentrationMilli.
const safePair = fc.tuple(doseMicros, concentrationMilli).filter(([dose, concentration]) =>
  dose * 200 >= concentration && dose * 2 <= concentration);
const linearPair = safePair.filter(([dose]) => dose <= 1000000);
const syringes: SyringeSelection[] = [
  ...['0.3 ml', '0.5 ml', '1 ml'].map(volume => ({ type: 'Insulin' as const, volume, insulinScale: 'U-100' })),
  ...['0.5 ml', '1 ml'].map(volume => ({ type: 'Insulin' as const, volume, insulinScale: 'U-40' })),
  ...['1 ml', '3 ml', '5 ml'].map(volume => ({ type: 'Standard' as const, volume })),
];
const syringeArb = fc.constantFrom(...syringes);
const standard: SyringeSelection = { type: 'Standard', volume: '3 ml' };
const base: CalculateDoseParams = {
  doseValue: 1, unit: 'mg', concentration: 10, concentrationUnit: 'mg/ml', manualSyringe: standard,
};
const calculate = (params: Partial<CalculateDoseParams>) => calculateDose({ ...base, ...params });

// Independent oracle: parse a decimal/fraction and compare integer cross-products.
// Do not use the production Exact arithmetic to calculate expected values.
function ratio(text: string): [bigint, bigint] {
  if (text.includes('/')) {
    const [n, d] = text.split('/');
    return [BigInt(n), BigInt(d)];
  }
  const [whole, fraction = ''] = text.split('.');
  return [BigInt(whole + fraction), BigInt(10) ** BigInt(fraction.length)];
}
function expectRatio(text: string, n: bigint, d: bigint) {
  const [actualN, actualD] = ratio(text);
  expect(actualN * d).toBe(n * actualD);
}
function success(result: CalculateDoseResult): string {
  expect(result.calculationError).toBeNull();
  expect(result.calculatedVolume).not.toBeNull();
  expect(Number.isFinite(result.calculatedVolume)).toBe(true);
  expect(result.calculatedVolume!).toBeGreaterThanOrEqual(0.005);
  expect(result.calculatedVolume!).toBeLessThanOrEqual(2);
  if (result.calculatedConcentration != null) {
    expect(Number.isFinite(result.calculatedConcentration)).toBe(true);
    expect(result.calculatedConcentration).toBeGreaterThan(0);
  }
  expect(result.recommendedMarking).not.toBeNull();
  return result.recommendedMarking!;
}
function failure(result: CalculateDoseResult) {
  expect(result.calculationError).toEqual(expect.any(String));
  expect(result.recommendedMarking).toBeNull();
  expect(result.calculatedVolume).toBeNull();
  expect(result.calculatedConcentration).toBeNull();
}

property('mg to mcg to mg round trip is exact', fc.property(doseMicros, dose => {
  const input = decimal(dose, 3);
  const mcg = new Exact(input).mul(1000);
  expectRatio(mcg.toString(), BigInt(dose), BigInt(1));
  expect(mcg.div(1000).toString()).toBe(input);
}));

for (const scale of [100, 40]) {
  property(`mL to U-${scale} to mL round trip is exact`, fc.property(enteredDecimal(100, 10000, 3), text => {
    const volume = parseInputNumber(text);
    const marking = new Exact(getMarkingGuidance(volume, 'Insulin', scale === 100 ? '10,20,100' : '1,20,40', scale).recommendedMarking);
    const [n, d] = ratio(text);
    expectRatio(marking.toString(), n * BigInt(scale), d);
    expectRatio(marking.div(scale).toString(), ...ratio(text));
    expect(marking.div(scale).toString()).toBe(text);
  }));
}

for (const scale of [100, 40]) {
  property(`dose doubling and concentration halving are linear on U-${scale}`, fc.property(linearPair, ([dose, concentration]) => {
    const params = { doseValue: Number(decimal(dose, 3)), concentration: Number(decimal(concentration, 3)),
      manualSyringe: { type: 'Insulin' as const, volume: '1 ml', insulinScale: `U-${scale}` } };
    const original = calculate(params);
    const doubled = calculate({ ...params, doseValue: Number(decimal(dose * 2, 3)) });
    const diluted = calculate({ ...params, concentration: Number(decimal(concentration * 5, 4)) });
    expectRatio(success(original), BigInt(dose * scale), BigInt(concentration));
    expectRatio(success(doubled), BigInt(dose * scale * 2), BigInt(concentration));
    expect(diluted.recommendedMarking).toBe(doubled.recommendedMarking);
    success(diluted);
    // Compare exact volumes before their compatibility projection to Number.
    expectRatio(new Exact(doubled.recommendedMarking!).div(scale).toString(), BigInt(dose * 2), BigInt(concentration));
  }));
}

property('mg and mcg dose and concentration combinations have identical volume', fc.property(safePair, ([dose, concentration]) => {
  const results = (['mg', 'mcg'] as const).flatMap(unit => (['mg/ml', 'mcg/ml'] as const).map(concentrationUnit =>
    calculate({ doseValue: unit === 'mg' ? Number(decimal(dose, 3)) : dose, unit,
      concentration: concentrationUnit === 'mg/ml' ? Number(decimal(concentration, 3)) : concentration, concentrationUnit })));
  for (const result of results) {
    expectRatio(success(result), BigInt(dose), BigInt(concentration));
    expect(result.calculatedVolume).toBe(results[0].calculatedVolume);
    expect(result.recommendedMarking).toBe(results[0].recommendedMarking);
  }
}));

const vialCase = fc.tuple(doseMicros, fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 100 }))
  .filter(([dose, count, solutionTenths]) => dose * count >= solutionTenths && solutionTenths <= count * 10);
property('vial unit conversions and repeating concentration paths agree exactly', fc.property(
  vialCase, fc.constantFrom('mg', 'mcg'), fc.constantFrom('mg', 'mcg'), ([dose, count, solutionTenths], doseUnit, vialUnit) => {
    const params = { unit: doseUnit, doseValue: doseUnit === 'mg' ? Number(decimal(dose, 3)) : dose,
      totalAmount: vialUnit === 'mg' ? Number(decimal(dose * count, 3)) : dose * count,
      totalAmountUnit: vialUnit, solutionVolume: decimal(solutionTenths, 1) };
    const derived = calculate({ ...params, concentration: null });
    const direct = calculate({ ...params, concentration: null, concentrationExact: `${dose * count}/${solutionTenths * 100}` });
    expectRatio(success(derived), BigInt(solutionTenths), BigInt(count * 10));
    expect(success(direct)).toBe(derived.recommendedMarking);
    expect(direct.calculatedVolume).toBe(derived.calculatedVolume);
  }));

property('total amount and entered concentration paths agree exactly', fc.property(
  // Shared accepted domain: derived mcg/mL has a lower bound of 1.
  enteredDecimal(100, 100000, 2), enteredDecimal(1, 100, 1), enteredDecimal(5, 1000, 3),
  fc.constantFrom('mg', 'mcg', 'units'), (concentrationText, solutionText, volumeText, unit) => {
    // Hundredths * tenths is a typed total with at most three decimal places.
    const [cn, cd] = ratio(concentrationText);
    const [sn, sd] = ratio(solutionText);
    const total = Number(cn * sn * BigInt(1000) / (cd * sd));
    const [vn, vd] = ratio(volumeText);
    const dose = Number(cn * vn * BigInt(100000) / (cd * vd));
    const params = { unit: unit as 'mg' | 'mcg' | 'units', concentrationUnit: `${unit}/ml` as CalculateDoseParams['concentrationUnit'],
      doseValue: Number(decimal(dose, 5)), totalAmount: Number(decimal(total, 3)), totalAmountUnit: unit as 'mg' | 'mcg' | 'units', solutionVolume: solutionText };
    const derived = calculate({ ...params, concentration: null });
    const entered = calculate({ ...params, concentration: Number(concentrationText) });
    // The selected dose may exceed the vial when preferred volume > solution volume.
    if (Number(volumeText) > Number(solutionText)) {
      failure(derived);
      failure(entered);
    } else {
      expectRatio(success(derived), vn, vd);
      expect(success(entered)).toBe(derived.recommendedMarking);
      expect(entered.calculatedVolume).toBe(derived.calculatedVolume);
    }
  }));

property('derived mcg concentration retains its existing lower bound', fc.property(
  fc.integer({ min: 1, max: 999 }), concentration => {
    const params = { doseValue: Number(decimal(concentration * 5, 4)), unit: 'mcg' as const,
      concentrationUnit: 'mcg/ml' as const, totalAmount: Number(decimal(concentration, 3)),
      totalAmountUnit: 'mcg' as const, solutionVolume: '1' };
    const derived = calculate({ ...params, concentration: null });
    failure(derived);
    expect(derived.calculationError).toContain('extremely low');
    expect(success(calculate({ ...params, concentration: Number(decimal(concentration, 3)) }))).toBe('0.5');
  }));

const plannerCase = fc.record({ dose: doseMicros, extra: fc.integer({ min: 0, max: 100000 }), preferred: fc.integer({ min: 100, max: 1000 }) })
  .filter(({ dose, extra, preferred }) => (dose + extra) * preferred <= dose * 20000);
property('planner exact BAC and handoff return the preferred volume', fc.property(plannerCase, fc.constantFrom('mg', 'mcg'), ({ dose, extra, preferred }, unit) => {
  const plan = calculateReconstitution({ peptideAmountMg: Number(decimal(dose + extra, 3)), targetDoseMg: Number(decimal(dose, 3)), preferredVolumeMl: Number(decimal(preferred, 3)) });
  expectRatio(plan.bacWaterExact, BigInt((dose + extra) * preferred), BigInt(dose * 1000));
  const handoff = getPlannerHandoff(plan, unit);
  const result = calculate({ ...handoff, unit, concentrationUnit: `${unit}/ml`,
    doseValue: unit === 'mg' ? Number(decimal(dose, 3)) : dose,
    totalAmount: unit === 'mg' ? Number(decimal(dose + extra, 3)) : dose + extra, totalAmountUnit: unit });
  expectRatio(success(result), BigInt(preferred), BigInt(1000));
  expect(result.calculatedVolume).toBe(Number(decimal(preferred, 3)));
}));

property('planner finite BAC fed through total amount returns the preferred volume', fc.property(
  doseMicros, fc.integer({ min: 1, max: 20 }), fc.integer({ min: 100, max: 1000 }), (dose, count, preferred) => {
    const plan = calculateReconstitution({ peptideAmountMg: Number(decimal(dose * count, 3)), targetDoseMg: Number(decimal(dose, 3)), preferredVolumeMl: Number(decimal(preferred, 3)) });
    const result = calculate({ doseValue: dose, unit: 'mcg', concentration: null, concentrationUnit: 'mcg/ml',
      totalAmount: dose * count, totalAmountUnit: 'mcg', solutionVolume: String(plan.bacWaterToAdd) });
    // Derived mcg/mL must be >= 1, per the existing policy.
    if (dose * 1000 < preferred) failure(result);
    else expectRatio(success(result), BigInt(preferred), BigInt(1000));
  }));

property('successful volumes are finite bounded and monotonic', fc.property(safePair, ([dose, concentration]) => {
  const first = calculate({ doseValue: Number(decimal(dose, 3)), concentration: Number(decimal(concentration, 3)) });
  const second = calculate({ doseValue: Number(decimal(dose * 2, 3)), concentration: Number(decimal(concentration, 3)) });
  const firstMark = success(first);
  const secondMark = success(second);
  const [an, ad] = ratio(firstMark);
  const [bn, bd] = ratio(secondMark);
  expect(bn * ad > an * bd).toBe(true);
  expect(second.calculatedVolume!).toBeGreaterThan(first.calculatedVolume!);
}));

property('all supported syringes accept only bounded finite direct volumes', fc.property(
  syringeArb, fc.oneof(enteredDecimal(1, 10000, 3).map(Number), fc.constantFrom(0.004999, 0.005, 0.3, 0.5, 1, 2, 2.000001)), (syringe, volume) => {
    const result = calculate({ unit: 'mL', doseValue: volume, concentration: null, manualSyringe: syringe });
    const capacity = Number(syringe.volume.split(' ')[0]);
    if (volume < 0.005 || volume > 2 || volume > capacity) failure(result);
    else {
      const scale = syringe.type === 'Standard' ? 1 : syringe.insulinScale === 'U-40' ? 40 : 100;
      const [n, d] = ratio(String(volume));
      expectRatio(success(result), n * BigInt(scale), d);
    }
  }));

property('invalid and extreme numeric inputs return an error without numbers', fc.property(
  fc.constantFrom(0, -1, NaN, Infinity, -Infinity, Number.MIN_VALUE, 1e-308, 1e308, Number.MAX_VALUE),
  fc.constantFrom('dose', 'concentration', 'total'), (value, field) => {
    const params: Partial<CalculateDoseParams> = field === 'dose' ? { doseValue: value }
      : field === 'concentration' ? { concentration: value }
        : { totalAmount: value, totalAmountUnit: 'mg', concentration: null, solutionVolume: '1' };
    failure(calculate(params));
  }));

const numericEdge = fc.constantFrom(0, -1, NaN, Infinity, -Infinity, Number.MIN_VALUE, 1e-308, 1e308, Number.MAX_VALUE);
property('independent extreme operands cannot leak nonfinite numeric results', fc.property(
  fc.oneof(numericEdge, doseMicros.map(dose => Number(decimal(dose, 3)))),
  fc.oneof(numericEdge, concentrationMilli.map(value => Number(decimal(value, 3)))), (doseValue, concentration) => {
    const result = calculate({ doseValue, concentration });
    if (result.calculationError) failure(result);
    else success(result);
  }));

property('unavailable medication never returns a numeric dose result', fc.property(
  doseMicros, dose => {
    failure(calculate({ doseValue: Number(decimal(dose, 3)), totalAmount: Number(decimal(dose * 5, 4)), totalAmountUnit: 'mg',
      concentration: Number(decimal(dose * 2, 3)) }));
  }));

for (const syringe of syringes) {
  const label = [syringe.type, syringe.insulinScale, syringe.volume].filter(Boolean).join(' ');
  property(`display is within half a step for ${label}`, fc.property(safePair, ([dose, concentration]) => {
    const result = calculate({ doseValue: Number(decimal(dose, 3)), concentration: Number(decimal(concentration, 3)), manualSyringe: syringe });
    if (dose / concentration > Number(syringe.volume.split(' ')[0])) { failure(result); return; }
    const exact = success(result);
    const display = formatDrawToText({ recommendedMarking: exact, syringeType: syringe.type })!;
    const text = display.split(' ')[2];
    expect(text).toMatch(/^\d+\.\d{2}$/);
    expect(text).not.toMatch(/0{7}|9{6}/);
    const [n, d] = ratio(exact);
    const cents = BigInt(text.replace('.', ''));
    const difference = cents * d - n * BigInt(100);
    expect((difference < BigInt(0) ? -difference : difference) * BigInt(2) <= d).toBe(true);
    // Integer half-away-from-zero oracle, including ties.
    expect(cents).toBe(n * BigInt(100) / d + (n * BigInt(100) % d * BigInt(2) >= d ? BigInt(1) : BigInt(0)));
  }));
}

property('display preserves every listed syringe gradation', fc.property(syringeArb, fc.nat(), (syringe, index) => {
  const markings = getSyringeMarkings(syringe)!.split(',');
  const exact = markings[index % markings.length];
  const display = formatDrawToText({ recommendedMarking: exact, syringeType: syringe.type })!.split(' ')[2];
  expectRatio(display, ...ratio(exact));
  const scale = syringe.type === 'Standard' ? 1 : syringe.insulinScale === 'U-40' ? 40 : 100;
  const [n, d] = ratio(exact);
  const result = calculate({ unit: 'mL', doseValue: Number(n) / Number(d) / scale, manualSyringe: syringe });
  if (Number(n) / Number(d) / scale > 2) failure(result);
  else expectRatio(success(result), n, d);
}));

property('decimal displays have no float artifacts at supported precisions', fc.property(
  enteredDecimal(1, 200000000, 5), fc.constantFrom(1, 2, 3, 4), (text, places) => {
    const display = formatDoseNumber(Number(text), places);
    expect(display).toMatch(new RegExp(`^\\d+\\.\\d{${places}}$`));
    expect(display).not.toMatch(/0{7}|9{6}/);
    const [n, d] = ratio(text);
    const scale = BigInt(10) ** BigInt(places);
    const rounded = BigInt(display.replace('.', ''));
    expect(rounded).toBe(n * scale / d + (n * scale % d * BigInt(2) >= d ? BigInt(1) : BigInt(0)));
  }));
