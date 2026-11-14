import { calculateDose, CalculateDoseParams, getCompatibleConcentrationUnits, validateUnitCompatibility, getAvailableVolumeError, getMarkingGuidance, syringeOptions, insulinVolumes, standardVolumes } from '..';

const base: CalculateDoseParams = {
  doseValue: 1, concentration: 10, unit: 'mg', concentrationUnit: 'mg/ml',
  manualSyringe: { type: 'Standard', volume: '3 ml' },
};
const dose = (overrides: Partial<CalculateDoseParams> = {}) => calculateDose({ ...base, totalAmountUnit: (overrides.concentrationUnit || base.concentrationUnit).split('/')[0] as 'mg', ...overrides });

describe('unit compatibility', () => {
  const doseUnits = ['mg', 'mcg', 'units', 'mL'] as const;
  const concentrationUnits = ['mg/ml', 'mcg/ml', 'units/ml'] as const;
  for (const unit of doseUnits) {
    for (const concentrationUnit of concentrationUnits) {
      it(`${unit} with ${concentrationUnit}`, () => {
        const valid = unit === 'mL' || (unit === 'units' ? concentrationUnit === 'units/ml' : concentrationUnit !== 'units/ml');
        expect(validateUnitCompatibility(unit, concentrationUnit)).toEqual(valid ? { isValid: true } : {
          isValid: false, errorMessage: `Incompatible units: ${unit} dose cannot be calculated with ${concentrationUnit} concentration.`,
        });
      });
    }
  }
  it.each([
    ['mg', ['mg/ml', 'mcg/ml']], ['mcg', ['mcg/ml', 'mg/ml']],
    ['units', ['units/ml']], ['mL', ['mg/ml', 'mcg/ml', 'units/ml']],
    ['unknown', ['mg/ml', 'mcg/ml', 'units/ml']],
  ])('compatible options for %s', (unit, expected) => {
    expect(getCompatibleConcentrationUnits(unit as CalculateDoseParams['unit'])).toEqual(expected);
  });
});

describe('input validation and order', () => {
  it.each([null, NaN, 0, -1])('invalid dose %s', doseValue => {
    expect(dose({ doseValue })).toEqual({ calculatedVolume: null, recommendedMarking: null,
      calculatedConcentration: null, calculationError: 'Dose value is invalid or missing.' });
  });
  it('incompatible units', () => {
    expect(dose({ unit: 'units' }).calculationError).toBe('Incompatible units: units dose cannot be calculated with mg/ml concentration.');
  });
  it.each([null, NaN, 0, -1])('invalid concentration %s', concentration => {
    expect(dose({ concentration }).calculationError).toBe('Concentration is invalid or missing.');
  });
  it.each([null, undefined])('unavailable total %s', totalAmount => {
    expect(dose({ concentration: null, totalAmount, solutionVolume: '2' }).calculationError).toBe('Concentration is invalid or missing.');
  });
  it.each([null, undefined, '', 'bad', '0', '-1'])('unavailable solution %s', solutionVolume => {
    expect(dose({ concentration: null, totalAmount: 5, solutionVolume }).calculationError).toBe('Concentration is invalid or missing.');
  });
  it.each([null, { type: '', volume: '1 ml' }, { type: 'Insulin', volume: '' }])('missing syringe %s', manualSyringe => {
    expect(dose({ manualSyringe: manualSyringe as CalculateDoseParams['manualSyringe'] }).calculationError).toBe('Syringe details are missing.');
  });
  it.each(['Insulin', 'Standard', 'Unknown'])('unknown %s syringe volume', type => {
    expect(dose({ manualSyringe: { type, volume: '9 ml' } as CalculateDoseParams['manualSyringe'] }).calculationError).toBe(`Markings unavailable for ${type} 9 ml syringe.`);
  });
  it('derives concentration when NaN or nonpositive', () => {
    for (const concentration of [NaN, 0, -1]) {
      expect(dose({ concentration, totalAmount: 5, solutionVolume: '2' }).calculatedConcentration).toBe(2.5);
    }
  });
  it('low derived mg concentration', () => {
    expect(dose({ concentration: null, totalAmount: 0.01, solutionVolume: '2' })).toEqual({
      calculatedVolume: null, recommendedMarking: null, calculatedConcentration: 0.005,
      calculationError: 'Calculated concentration (0.0050 mg/ml) is extremely low. Please verify the total amount (0.01 mg) and solution volume (2 ml) are correct.',
    });
  });
  it('low derived mcg concentration', () => {
    expect(dose({ unit: 'mcg', concentrationUnit: 'mcg/ml', concentration: null, totalAmount: 1, solutionVolume: '2' }).calculationError)
      .toBe('Calculated concentration (0.5000 mcg/ml) is extremely low. Please verify the total amount (1 mcg) and solution volume (2 ml) are correct.');
  });
  it.each([
    ['mg', 'mg/ml', 0.01, 0.005], ['mcg', 'mcg/ml', 1, 0.5], ['units', 'units/ml', 1, 0.5],
  ] as const)('derived threshold accepted: %s', (unit, concentrationUnit, totalAmount, doseValue) => {
    expect(dose({ unit, concentrationUnit, doseValue, concentration: null, totalAmount, solutionVolume: '1' }).calculatedVolume).toBe(0.5);
  });
  it('explicit concentration takes precedence over vial inputs', () => {
    expect(dose({ totalAmount: 5, solutionVolume: 'bad' }).calculatedConcentration).toBeNull();
  });
});

describe('dose volumes and limits', () => {
  it.each([
    ['mg', 'mg/ml', 1, 10, 0.1], ['mcg', 'mcg/ml', 100, 1000, 0.1],
    ['units', 'units/ml', 10, 100, 0.1], ['mcg', 'mg/ml', 250, 2.5, 0.1],
    ['mg', 'mcg/ml', 0.25, 2500, 0.1], ['mL', 'mg/ml', 0.1, 10, 0.1],
  ] as const)('%s with %s', (unit, concentrationUnit, doseValue, concentration, volume) => {
    expect(dose({ unit, concentrationUnit, doseValue, concentration }).calculatedVolume).toBe(volume);
  });
  it.each([0.004, 2.001])('outside volume threshold: %s', doseValue => {
    expect(dose({ unit: 'mL', doseValue }).calculationError).toBe('VOLUME_THRESHOLD_ERROR:Calculated volume is outside safe thresholds.');
  });
  it.each([0.005, 2])('inclusive volume threshold: %s', doseValue => {
    expect(dose({ unit: 'mL', doseValue }).calculatedVolume).toBe(doseValue);
    expect(dose({ unit: 'mL', doseValue }).recommendedMarking).toBe(String(doseValue));
  });
  it('insulin limit comes before total availability and syringe capacity', () => {
    expect(dose({ doseValue: 15, totalAmount: 1, manualSyringe: { type: 'Insulin', volume: '0.3 ml' } }).calculationError)
      .toBe('Required volume (1.50 ml) is too large for practical use with an insulin syringe. Consider using a standard syringe or checking your concentration calculation.');
  });
  it('exactly 1 mL on insulin syringe', () => {
    expect(dose({ doseValue: 10, manualSyringe: { type: 'Insulin', volume: '1 ml' } }).recommendedMarking).toBe('100');
  });
  it.each([
    ['mg', 'mg/ml', 2, 1, 'mg'], ['mcg', 'mg/ml', 2000, 1, 'mg'],
    ['mg', 'mcg/ml', 0.002, 1, 'mcg'], ['mcg', 'mcg/ml', 2, 1, 'mcg'],
  ] as const)('dose exceeds total %s/%s', (unit, concentrationUnit, doseValue, totalAmount, label) => {
    expect(dose({ unit, concentrationUnit, doseValue, totalAmount, concentration: 1 }).calculationError)
      .toBe(`Requested dose (${doseValue} ${unit}) exceeds total amount available (${totalAmount} ${label}).`);
  });
  it('null total and direct volume bypass total checks', () => {
    expect(dose({ totalAmount: null }).recommendedMarking).toBe('0.1');
    expect(dose({ unit: 'mL', totalAmount: 0 }).recommendedMarking).toBe('1');
  });
  it('required volume exceeds the maximum possible volume', () => {
    // Earlier dose checks preclude this branch through calculateDose for finite inputs.
    // Exercise the defensive volume check directly with an independently supplied volume.
    expect(getAvailableVolumeError(1, 5, 10))
      .toBe('Required volume (1.00 ml) exceeds what can be made from available medication (0.50 ml).');
    expect(getAvailableVolumeError(0.5, 5, 10)).toBeNull();
  });
  it('syringe capacity', () => {
    expect(dose({ doseValue: 15, manualSyringe: { type: 'Standard', volume: '1 ml' } }).calculationError)
      .toBe('Required volume (1.50 ml) exceeds syringe capacity (1 ml).');
  });
  it('exact marking', () => {
    expect(dose({ doseValue: 5 })).toEqual({ calculatedVolume: 0.5, recommendedMarking: '0.5', calculationError: null, calculatedConcentration: null });
  });
  it('between markings', () => {
    expect(dose({ doseValue: 7.5 }).calculationError).toBe('Draw to 0.75 ml, which is between the 0.5 ml and 1 ml marks.');
  });
  it('below first marking', () => {
    expect(dose().calculationError).toBe('Draw to 0.10 ml, which is below the first marking at 0.5 ml.');
  });
  it('insulin between markings', () => {
    expect(dose({ doseValue: 1.5, manualSyringe: { type: 'Insulin', volume: '1 ml' } }).calculationError)
      .toBe('Draw to 15.00 units, which is between the 10 units and 20 units marks.');
  });
  it('above last marking in marking helper (built-in lists end at capacity)', () => {
    expect(getMarkingGuidance(0.9, 'Standard', '0.1,0.5')).toEqual({ recommendedMarking: '0.9', precisionMessage: 'Draw to 0.90 ml, which is above the 0.5 ml mark.' });
  });
  it('keeps all syringe lists and capacities', () => {
    expect(insulinVolumes).toEqual(['0.3 ml', '0.5 ml', '1 ml']);
    expect(standardVolumes).toEqual(['1 ml', '3 ml', '5 ml']);
    expect(syringeOptions.Insulin['0.3 ml']).toBe('5,10,15,20,25,30');
    expect(syringeOptions.Insulin['0.5 ml']).toBe('5,10,15,20,25,30,35,40,45,50');
    expect(syringeOptions.Standard['5 ml']).toBe('1.0,2.0,3.0,4.0,5.0');
  });
});

it('returns clean U-100 marking', () => {
  expect(dose({ unit: 'units', concentrationUnit: 'units/ml', doseValue: 29, concentration: 100,
    manualSyringe: { type: 'Insulin', volume: '1 ml' } }).recommendedMarking).toBe('29');
});
it('direct mL does not require concentration', () => {
  expect(dose({ unit: 'mL', concentration: null }).calculationError).toBeNull();
});
it('rejects nonfinite dose', () => {
  expect(dose({ doseValue: Infinity, concentration: Infinity }).calculationError).toBe('Dose value is invalid or missing.');
});
