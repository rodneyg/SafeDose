import {
  calculateDose, CalculateDoseParams, CalculateDoseResult, SyringeSelection,
  getReconstitutionResult, getReconstitutionInputError, getPlannerHandoff,
  ReconstitutionInputs, formatDoseNumber, formatDrawToText, formatConcentration,
  parseScannedConcentration,
} from '..';

const base: CalculateDoseParams = {
  doseValue: 1, unit: 'mg', concentration: 8, concentrationUnit: 'mg/ml',
  manualSyringe: { type: 'Standard', volume: '3 ml' },
};

// Test-only dimensional oracle: represent expected volumes as integer ratios.
// Read the public canonical marking without importing production Exact arithmetic.
function ratio(text: string): [bigint, bigint] {
  if (text.includes('/')) {
    const [n, d] = text.split('/');
    return [BigInt(n), BigInt(d)];
  }
  const [whole, decimal = ''] = text.split('.');
  return [BigInt(whole + decimal), 10n ** BigInt(decimal.length)];
}
function assertAnswer(result: CalculateDoseResult, n: bigint, d: bigint, scale = 1n) {
  expect(result.calculationError).toBeNull();
  expect(result.calculatedVolume).toBe(Number(n) / Number(d));
  expect(result.recommendedMarking).not.toBeNull();
  const [actualN, actualD] = ratio(result.recommendedMarking!);
  expect(actualN * d).toBe(n * scale * actualD);
}
function assertBlocked(overrides: Partial<CalculateDoseParams>, error: string) {
  expect(calculateDose({ ...base, ...overrides })).toEqual({
    calculatedVolume: null, calculatedConcentration: null, recommendedMarking: null,
    calculationError: expect.stringContaining(error),
  });
}

// A 375 mcg dose at 3 mg/mL is (375 / 1000) / 3 = 1/8 mL.
const massCases = [
  ['mg', 'mg/ml', 0.375, 3], ['mcg', 'mg/ml', 375, 3],
  ['mg', 'mcg/ml', 0.375, 3000], ['mcg', 'mcg/ml', 375, 3000],
  ['units', 'units/ml', 15, 120],
] as const;

describe('SAF-305 independent known answers', () => {
  it.each(massCases)('supplied concentration: %s at %s', (unit, concentrationUnit, doseValue, concentration) => {
    assertAnswer(calculateDose({ ...base, unit, concentrationUnit, doseValue, concentration }), 1n, 8n);
  });

  const syringes: [SyringeSelection, bigint][] = [
    [{ type: 'Standard', volume: '1 ml' }, 1n],
    [{ type: 'Standard', volume: '3 ml' }, 1n],
    [{ type: 'Standard', volume: '5 ml' }, 1n],
    ...['0.3 ml', '0.5 ml', '1 ml'].map(volume => [
      { type: 'Insulin', volume, insulinScale: 'U-100' }, 100n,
    ] as [SyringeSelection, bigint]),
    ...['0.5 ml', '1 ml'].map(volume => [
      { type: 'Insulin', volume, insulinScale: 'U-40' }, 40n,
    ] as [SyringeSelection, bigint]),
  ];
  it.each(syringes)('direct volume and supplied concentration on %j', (manualSyringe, scale) => {
    assertAnswer(calculateDose({ ...base, manualSyringe }), 1n, 8n, scale);
    for (const concentrationUnit of ['mg/ml', 'mcg/ml', 'units/ml'] as const) {
      assertAnswer(calculateDose({ ...base, manualSyringe, unit: 'mL', doseValue: 0.125,
        concentration: null, concentrationUnit, totalAmount: 0, solutionVolume: '0',
      }), 1n, 8n, scale);
    }
  });

  for (const totalAmountUnit of ['mg', 'mcg'] as const) {
    it.each(massCases.slice(0, 4))(`vial-derived ${totalAmountUnit}: %s at %s`, (unit, concentrationUnit, doseValue) => {
      // 9 mg in 3 mL gives 3 mg/mL, regardless of explicit vial unit.
      const result = calculateDose({ ...base, unit, concentrationUnit, doseValue,
        concentration: null, totalAmount: totalAmountUnit === 'mg' ? 9 : 9000,
        totalAmountUnit, solutionVolume: '3' });
      assertAnswer(result, 1n, 8n);
      expect(result.calculatedConcentration).toBe(concentrationUnit === 'mg/ml' ? 9 / 3 : 9000 / 3);
    });
  }
  it('vial-derived medication units', () => {
    assertAnswer(calculateDose({ ...base, unit: 'units', doseValue: 15, concentrationUnit: 'units/ml',
      concentration: null, totalAmount: 360, totalAmountUnit: 'units', solutionVolume: '3' }), 1n, 8n);
  });

  it('exact handoff overrides a rounded numeric concentration without rounding the marking', () => {
    // Dose 1 mg at 10/3 mg/mL needs exactly 3/10 mL.
    assertAnswer(calculateDose({ ...base, concentration: 3.333, concentrationExact: '10/3',
      manualSyringe: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' } }), 3n, 10n, 100n);
    // Dose 1 mg at 3 mg/mL gives a repeating marking, not a snapped barrel value.
    const result = calculateDose({ ...base, concentration: 3,
      manualSyringe: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-100' } });
    assertAnswer(result, 1n, 3n, 100n);
    expect(formatDrawToText({ recommendedMarking: result.recommendedMarking!, syringeType: 'Insulin' }))
      .toBe('Draw to 33.33 units');
  });

  it.each([1e-200, 1e200])('finite extreme supplied concentration %s', concentration => {
    assertAnswer(calculateDose({ ...base, doseValue: concentration / 8, concentration }), 1n, 8n);
  });
  it.each([0, null, NaN, Infinity, -1])('refuses unusable concentration %s', concentration => {
    assertBlocked({ concentration }, 'Concentration is invalid or missing');
  });
  it.each(['0', '', '-1', '1e3', '1.000,5'])('refuses unusable solution volume %s', solutionVolume => {
    assertBlocked({ concentration: null, totalAmount: 9, totalAmountUnit: 'mg', solutionVolume }, 'Concentration is invalid or missing');
  });
  it.each([0, -1, Infinity, NaN])('refuses empty or invalid vial %s', totalAmount => {
    assertBlocked({ totalAmount, totalAmountUnit: 'mg', concentration: null, solutionVolume: '3' }, 'valid total amount');
  });
  it.each(['0', '1/0', '-1/3', 'bad'])('refuses exact concentration %s', concentrationExact => {
    assertBlocked({ concentrationExact }, 'invalid exact concentration');
  });
  it('requires explicit vial units and refuses mass/medication-unit conversion in both directions', () => {
    assertBlocked({ totalAmount: 9 }, 'select the total amount unit');
    assertBlocked({ totalAmount: 9, totalAmountUnit: 'units' }, 'incompatible');
    assertBlocked({ totalAmount: 9, totalAmountUnit: 'mg', unit: 'units', concentrationUnit: 'units/ml' }, 'incompatible');
    assertBlocked({ unit: 'units' }, 'Incompatible units');
    assertBlocked({ concentrationUnit: 'units/ml' }, 'Incompatible units');
  });
  it.each(['mg', 'mcg'] as const)('vial exhaustion in %s is exact after conversion', totalAmountUnit => {
    const params = { ...base, doseValue: 1, concentration: 2, totalAmount: totalAmountUnit === 'mg' ? 1 : 1000, totalAmountUnit };
    assertAnswer(calculateDose(params), 1n, 2n);
    assertBlocked({ ...params, doseValue: 1.000001 }, 'exceeds total amount');
  });
  it.each([0.0049999, 2.0000001])('does not round an unsafe volume %s into range', doseValue => {
    assertBlocked({ unit: 'mL', doseValue }, 'VOLUME_THRESHOLD_ERROR');
  });
  it.each([[0.005, 1n, 200n], [2, 2n, 1n]] as const)('accepts exact volume boundary %s', (doseValue, n, d) => {
    assertAnswer(calculateDose({ ...base, unit: 'mL', doseValue }), n, d);
  });

  it.each([
    ['mg', 'mg/ml', 0.01, 0.005, 0.01],
    ['mcg', 'mcg/ml', 1, 0.5, 1],
    ['units', 'units/ml', 1e-200, 5e-201, 1e-200],
    ['mg', 'mg/ml', 1e200, 5e199, 1e200],
  ] as const)('derived concentration boundary %s %s %s', (unit, concentrationUnit, totalAmount, doseValue, concentration) => {
    const result = calculateDose({ ...base, unit, concentrationUnit, totalAmount, totalAmountUnit: unit,
      doseValue, concentration: null, solutionVolume: '1' });
    assertAnswer(result, 1n, 2n);
    expect(result.calculatedConcentration).toBe(concentration);
  });
  it.each([
    ['mg', 'mg/ml', 0.0099999], ['mcg', 'mcg/ml', 0.9999999],
  ] as const)('does not round a low derived concentration into range: %s', (unit, concentrationUnit, totalAmount) => {
    assertBlocked({ unit, concentrationUnit, totalAmount, totalAmountUnit: unit,
      doseValue: totalAmount / 2, concentration: null, solutionVolume: '1' }, 'extremely low');
  });
  it.each([
    ['0.0999999', false], ['0.1', true], ['20', true], ['20.0000001', false],
  ] as const)('planner validates computed BAC volume %s before display rounding', (preferredVolume, accepted) => {
    // Equal vial and dose mass makes BAC water exactly the entered preferred volume.
    const input: ReconstitutionInputs = { peptideAmount: '1', peptideUnit: 'mg', scannedPeptideAmount: null,
      targetDose: '1000', targetDoseUnit: 'mcg', preferredVolume };
    const result = getReconstitutionResult(input)!;
    expect(result.bacWaterToAdd).toBe(Number(preferredVolume));
    expect(getReconstitutionInputError(input, result) === null).toBe(accepted);
  });

  it.each(['mg', 'mcg'] as const)('repeating planner handoff in %s preserves exact math', unit => {
    const input: ReconstitutionInputs = { peptideAmount: unit === 'mg' ? '7' : '7000',
      peptideUnit: unit, scannedPeptideAmount: null, targetDose: '300', targetDoseUnit: 'mcg', preferredVolume: '0.2' };
    const plan = getReconstitutionResult(input)!;
    expect(getReconstitutionInputError(input, plan)).toBeNull();
    // 300/1000 mg divided by 2/10 mL = 3/2 mg/mL; water = 7/(3/2) = 14/3 mL.
    expect(plan.concentration).toBe(3 / 2);
    expect(plan.bacWaterToAdd).toBe(14 / 3);
    const [waterN, waterD] = ratio(plan.bacWaterExact);
    expect(waterN * 3n).toBe(14n * waterD);
    const handoff = getPlannerHandoff(plan, unit);
    assertAnswer(calculateDose({ ...base, ...handoff, concentrationUnit: `${unit}/ml`, unit: 'mcg',
      doseValue: 300, totalAmount: unit === 'mg' ? 7 : 7000, totalAmountUnit: unit,
      manualSyringe: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-40' } }), 1n, 5n, 40n);
  });

  it.each([' mg / mL ', 'MG/ML', 'mcg/mL', 'µg/mL', 'μg/mL', 'ug/mL', 'units/mL', 'u/mL'])('scan units feed a dimensional answer: %s', label => {
    const parsed = parseScannedConcentration(`8 ${label}`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error('Expected supported scan unit');
    const unit = parsed.value.unit.split('/')[0] as 'mg' | 'mcg' | 'units';
    assertAnswer(calculateDose({ ...base, unit, concentrationUnit: parsed.value.unit, concentration: parsed.value.amount }), 1n, 8n);
  });
});

// Independently round an integer count of subunits, using quotient/remainder.
// No production arithmetic, formatting, or floating point toFixed in the oracle.
function rounded(subunits: number, places: number): string {
  const magnitude = Math.abs(subunits);
  const count = Math.floor(magnitude / 10) + (magnitude % 10 >= 5 ? 1 : 0);
  const digits = String(count).padStart(places + 1, '0');
  const body = places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits;
  return subunits < 0 && count !== 0 ? `-${body}` : body;
}
describe('SAF-305 display rounding boundaries', () => {
  for (const places of [0, 1, 2, 3, 4]) {
    it.each([1004, 1005, 1006, 9994, 9995, 9996, -1004, -1005, -1006, -9995])(`half-away rounding at ${places} places: %s`, subunits => {
      expect(formatDoseNumber(subunits / 10 ** (places + 1), places)).toBe(rounded(subunits, places));
    });
  }
  it.each([1249, 1250, 1251])('draw text rounds only at display: %s', tenThousandths => {
    const result = calculateDose({ ...base, unit: 'mL', doseValue: tenThousandths / 10000 });
    assertAnswer(result, BigInt(tenThousandths), 10000n);
    expect(formatDrawToText({ recommendedMarking: result.recommendedMarking!, syringeType: 'Standard' }))
      .toBe(`Draw to ${rounded(Math.floor(tenThousandths / 10), 2)} ml`);
  });
  it('compact concentration rounds across 1 and strips display zeros', () => {
    expect(formatConcentration(9995, 'mcg', 10000)).toBe('1 mcg/mL');
    expect(formatConcentration(1995, 'mg', 100)).toBe('20 mg/mL');
  });
});
