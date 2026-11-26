import {
  normalizeAmountUnit,
  parseInputNumber,
  parsePlannerPrefill,
  parsePlannerScan,
  parseScannedAmount,
  parseScannedConcentration,
  parseScannedSyringe,
} from '../inputs';

describe('dosing inputs', () => {
  describe('parseInputNumber', () => {
    it.each([
      [' 12.5 ', 12.5],
      ['.25', 0.25],
      ['0.125', 0.125],
      ['1,000', 1000],
      ['+1,234.5', 1234.5],
      ['-0.5', -0.5],
    ])('parses %p without accepting a numeric prefix', (text, expected) => {
      expect(parseInputNumber(text)).toBe(expected);
    });

    it.each(['', '1mg', '1,23', '1.', 'NaN', 'Infinity', '1e3'])('rejects malformed input %p', text => {
      expect(parseInputNumber(text)).toBeNaN();
    });

    it.each(['0,125', '000,500', '+00,125', '-01,250.5', '0,125,000'])('rejects leading zeros in a comma group in %p', text => {
      expect(parseInputNumber(text)).toBeNaN();
    });

    it('rejects non-finite and precision-losing values', () => {
      expect(parseInputNumber('9'.repeat(400))).toBeNaN();
      expect(parseInputNumber('9007199254740993')).toBeNaN();
    });
  });

  describe('normalizeAmountUnit', () => {
    it.each([
      [' MG ', 'mg'],
      ['mcg', 'mcg'],
      ['µg', 'mcg'],
      ['μg', 'mcg'],
      ['ug', 'mcg'],
      ['units', 'units'],
      ['U', 'units'],
    ] as const)('normalizes %p to %p', (text, expected) => {
      expect(normalizeAmountUnit(text)).toBe(expected);
    });

    it('rejects unknown units', () => {
      expect(normalizeAmountUnit('mL')).toBeNull();
    });
  });

  describe('amount and planner inputs', () => {
    it('parses a positive scanned amount and normalized unit', () => {
      expect(parseScannedAmount(' 1,250 µg ')).toEqual({
        ok: true,
        value: { amount: 1250, unit: 'mcg' },
      });
    });

    it.each(['missing', '0 mg', '-1 mg', '1 tablets', '0,125 mg'])('rejects invalid scanned amount %p', text => {
      expect(parseScannedAmount(text)).toEqual({
        ok: false,
        error: 'Needs input: enter a valid total amount and select its unit (mg, mcg, or units).',
      });
    });

    it('builds a planner prefill and preserves exact concentration text', () => {
      expect(parsePlannerPrefill({
        prefillTotalAmount: '10',
        prefillTotalUnit: 'mg',
        prefillSolutionVolume: '2.5',
        prefillConcentrationExact: '4',
      })).toEqual({
        ok: true,
        value: {
          concentrationExact: '4',
          totalAmount: 10,
          totalAmountUnit: 'mg',
          concentrationUnit: 'mg/ml',
          solutionVolume: '2.5',
        },
      });
    });

    it('returns the amount error before validating planner volume', () => {
      expect(parsePlannerPrefill({ prefillSolutionVolume: '2' })).toEqual(
        parseScannedAmount(' '),
      );
    });

    it.each([undefined, '', '0', '-1', 'two'])('rejects planner volume %p', prefillSolutionVolume => {
      expect(parsePlannerPrefill({
        prefillTotalAmount: '10',
        prefillTotalUnit: 'mg',
        prefillSolutionVolume,
      })).toEqual({ ok: false, error: 'Needs input: enter the solution volume in mL.' });
    });

    it('accepts mg and mcg planner scans', () => {
      expect(parsePlannerScan({ totalAmount: '2 mg' })).toEqual({ ok: true, value: { amount: 2, unit: 'mg' } });
      expect(parsePlannerScan({ totalAmount: '500 mcg', concentration: 'unused' })).toEqual({ ok: true, value: { amount: 500, unit: 'mcg' } });
    });

    it('passes through invalid amount errors and rejects medication units', () => {
      expect(parsePlannerScan({ totalAmount: null })).toEqual(parseScannedAmount(''));
      expect(parsePlannerScan({ totalAmount: '10 units' })).toEqual({
        ok: false,
        error: 'Needs input: the planner requires a vial amount in mg or mcg, not concentration or medication units.',
      });
    });
  });

  describe('parseScannedConcentration', () => {
    it.each([
      ['2.5 mg / mL', { amount: 2.5, unit: 'mg/ml' }],
      ['1,000 μg/ml', { amount: 1000, unit: 'mcg/ml' }],
      ['40 U/ML', { amount: 40, unit: 'units/ml' }],
    ] as const)('parses %p', (text, value) => {
      expect(parseScannedConcentration(text)).toEqual({ ok: true, value });
    });

    it.each(['missing', '0 mg/ml', '-1 mg/ml', '2 tablets/ml', '2 mg/l', '0,125 mg/ml'])('rejects %p', text => {
      expect(parseScannedConcentration(text)).toEqual({
        ok: false,
        error: 'Needs input: enter a valid concentration and select mg/mL, mcg/mL, or units/mL. Unknown units are not supported.',
      });
    });
  });

  describe('parseScannedSyringe', () => {
    it('parses a standard syringe without an insulin scale', () => {
      expect(parseScannedSyringe({ type: ' STANDARD ', volume: ' 3 ML ' })).toEqual({
        ok: true,
        value: { type: 'Standard', volume: '3 ml' },
      });
    });

    it('parses supported U-100 and U-40 insulin syringes', () => {
      expect(parseScannedSyringe({ type: 'insulin', volume: '0.3ml', scale: 'u-100' })).toEqual({
        ok: true,
        value: { type: 'Insulin', volume: '0.3 ml', insulinScale: 'U-100' },
      });
      expect(parseScannedSyringe({ type: 'INSULIN', volume: '1 ml', scale: ' U-40 ' }, 'U-40')).toEqual({
        ok: true,
        value: { type: 'Insulin', volume: '1 ml', insulinScale: 'U-40' },
      });
    });

    it.each([
      [{}, 'Needs input: select the syringe type and volume from its label.'],
      [{ type: 'other', volume: '1 ml' }, 'Needs input: select the syringe type and volume from its label.'],
      [{ type: 'standard', volume: '2 ml' }, 'Needs input: select a supported syringe volume from its label.'],
      [{ type: 'insulin', volume: '1 ml' }, 'Needs input: confirm the insulin scale. Only U-100 and U-40 are supported.'],
      [{ type: 'insulin', volume: '1 ml', scale: 'U-80' }, 'Needs input: confirm the insulin scale. Only U-100 and U-40 are supported.'],
      [{ type: 'insulin', volume: '1 ml', scale: 'U-40' }, 'Needs input: scanned U-40 conflicts with selected U-100. Select the scale printed on your syringe.'],
      [{ type: 'insulin', volume: '0.3 ml', scale: 'U-40' }, 'Needs input: U-40 supports 0.5 mL and 1 mL syringes only.'],
    ] as const)('rejects invalid syringe input %#', (scan, error) => {
      const selectedScale = 'scale' in scan && 'volume' in scan
        && scan.scale === 'U-40' && scan.volume === '0.3 ml' ? 'U-40' : undefined;
      expect(parseScannedSyringe(scan, selectedScale)).toEqual({ ok: false, error });
    });
  });
});
