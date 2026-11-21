import { Exact } from '../exact';

describe('Exact', () => {
  describe('construction', () => {
    it.each([
      ['0.125', '1', '8'],
      ['+.50', '1', '2'],
      ['-1.25E+2', '-125', '1'],
      ['2e-3', '1', '500'],
      ['6/-8', '-3', '4'],
      ['-6/-8', '3', '4'],
      ['-0.00', '0', '1'],
      ['9007199254740993', '9007199254740993', '1'],
    ])('normalizes %s to %s/%s', (input, numerator, denominator) => {
      const exact = new Exact(input);

      expect(exact.n).toBe(BigInt(numerator));
      expect(exact.d).toBe(BigInt(denominator));
    });

    it('copies an exact value and applies an additional denominator', () => {
      const original = new Exact('2/3');

      expect(new Exact(original)).toEqual(original);
      expect(new Exact(original, BigInt(-2)).toString()).toBe('-1/3');
    });

    it.each(['', 'e2', '1.2.3', '1.5x', NaN, Infinity])(
      'rejects invalid input %s',
      (input) => {
        expect(() => new Exact(input)).toThrow('Invalid exact number');
      },
    );

    it('rejects zero denominators from fractions and constructor arguments', () => {
      expect(() => new Exact('1/0')).toThrow('Division by zero');
      expect(() => new Exact(1, BigInt(0))).toThrow('Division by zero');
    });
  });

  describe('arithmetic and comparison', () => {
    it('multiplies and divides without rounding intermediate values', () => {
      const third = new Exact('1/3');

      expect(third.mul(new Exact('-9/2')).toString()).toBe('-1.5');
      expect(third.mul(0.3).toString()).toBe('0.1');
      expect(third.div(new Exact('-2/3')).toString()).toBe('-0.5');
      expect(third.div(2).toString()).toBe('1/6');
    });

    it('rejects division by zero', () => {
      expect(() => new Exact(1).div(0)).toThrow('Division by zero');
    });

    it('compares rationals even when their numeric conversions coincide', () => {
      const third = new Exact('1/3');
      const lower = new Exact('0.33333333333333333');

      expect(third.toNumber()).toBe(lower.toNumber());
      expect(lower.compare(third)).toBe(-1);
      expect(third.compare(lower)).toBe(1);
      expect(third.compare(new Exact('2/6'))).toBe(0);
      expect(new Exact('1/2').compare(0.5)).toBe(0);
    });

    it('computes absolute distance in either order', () => {
      const left = new Exact('-1/6');
      const right = new Exact('1/3');

      expect(left.distance(right).toString()).toBe('0.5');
      expect(right.distance(left).toString()).toBe('0.5');
      expect(left.distance(left).toString()).toBe('0');
    });
  });

  describe('conversion and rounding', () => {
    it.each([
      ['1/8', '0.125'],
      ['1/125', '0.008'],
      ['7/40', '0.175'],
      ['-2/6', '-1/3'],
      ['1000', '1000'],
    ])('renders %s as %s', (input, expected) => {
      expect(new Exact(input).toString()).toBe(expected);
    });

    it.each([
      ['1.2449', 2, '1.24'],
      ['1.245', 2, '1.25'],
      ['-1.245', 2, '-1.25'],
      ['9.995', 2, '10.00'],
      ['-2.5', 0, '-3'],
      ['-0.0049', 2, '0.00'],
      ['-0.005', 2, '-0.01'],
      ['1/6', 3, '0.167'],
      ['2', 3, '2.000'],
    ])('rounds %s to %i places as %s', (input, digits, expected) => {
      expect(new Exact(input).fixed(digits)).toBe(expected);
    });

    it('converts finite fractional, recurring, and subnormal values to numbers', () => {
      expect(new Exact('-1/8').toNumber()).toBe(-0.125);
      expect(new Exact('1/3').toNumber()).toBe(1 / 3);
      expect(new Exact(Number.MIN_VALUE).toNumber()).toBe(Number.MIN_VALUE);
    });
  });
});
