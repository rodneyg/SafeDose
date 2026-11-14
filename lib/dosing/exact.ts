/** Exact rational arithmetic. Decimal rounding is confined to fixed() at display boundaries. */
export class Exact {
  readonly n: bigint;
  readonly d: bigint;

  constructor(value: string | number | Exact, denominator: bigint = BigInt(1)) {
    let n: bigint;
    let d: bigint;
    if (value instanceof Exact) {
      n = value.n;
      d = value.d;
    } else {
      const parts = String(value).split('/');
      if (parts.length === 2) {
        n = BigInt(parts[0]);
        d = BigInt(parts[1]);
      } else {
        const match = String(value).match(/^([+-]?)(\d*)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
        if (!match || !(match[2] || match[3])) throw new Error('Invalid exact number');
        const decimals = match[3] || '';
        const exponent = Number(match[4] || 0) - decimals.length;
        n = BigInt(`${match[1]}${match[2]}${decimals}`);
        d = BigInt(10) ** BigInt(Math.max(0, -exponent));
        n *= BigInt(10) ** BigInt(Math.max(0, exponent));
      }
    }
    d *= denominator;
    if (d === BigInt(0)) throw new Error('Division by zero');
    if (d < BigInt(0)) { n = -n; d = -d; }
    let a = n < BigInt(0) ? -n : n;
    let b = d;
    while (b !== BigInt(0)) { const remainder = a % b; a = b; b = remainder; }
    this.n = n / a;
    this.d = d / a;
  }

  mul(value: Exact | number): Exact {
    const other = new Exact(value);
    return new Exact(String(this.n * other.n), this.d * other.d);
  }

  div(value: Exact | number): Exact {
    const other = new Exact(value);
    return new Exact(String(this.n * other.d), this.d * other.n);
  }

  compare(value: Exact | number): number {
    const other = new Exact(value);
    const difference = this.n * other.d - other.n * this.d;
    return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
  }

  distance(value: Exact): Exact {
    const difference = this.n * value.d - value.n * this.d;
    return new Exact(String(difference < BigInt(0) ? -difference : difference), this.d * value.d);
  }

  toNumber(): number { return Number(this.n) / Number(this.d); }

  toString(): string {
    let remainder = this.d;
    let twos = 0;
    let fives = 0;
    while (remainder % BigInt(2) === BigInt(0)) { remainder /= BigInt(2); twos++; }
    while (remainder % BigInt(5) === BigInt(0)) { remainder /= BigInt(5); fives++; }
    if (remainder !== BigInt(1)) return `${this.n}/${this.d}`;
    return this.fixed(Math.max(twos, fives)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  /** Round half away from zero, including exact ties. */
  fixed(digits: number): string {
    const negative = this.n < BigInt(0);
    const numerator = negative ? -this.n : this.n;
    const scaled = numerator * BigInt(10) ** BigInt(digits);
    const rounded = scaled / this.d + (scaled % this.d * BigInt(2) >= this.d ? BigInt(1) : BigInt(0));
    const text = String(rounded).padStart(digits + 1, '0');
    const body = digits === 0 ? text : `${text.slice(0, -digits)}.${text.slice(-digits)}`;
    return negative && rounded !== BigInt(0) ? `-${body}` : body;
  }
}
