import { estimateVialSupply, VialSupplyLog } from '../vialSupply';

const log = (over: Partial<VialSupplyLog> = {}): VialSupplyLog => ({
  substanceName: 'BPC-157', doseValue: 0.25, unit: 'mg', timestamp: '2026-11-20T10:00:00.000Z',
  medicationInputType: 'totalAmount', totalAmount: '5', totalAmountUnit: 'mg', ...over,
});

describe('estimateVialSupply', () => {
  it('returns null with no vial context', () => {
    expect(estimateVialSupply([])).toBeNull();
    expect(estimateVialSupply([log({ medicationInputType: 'concentration' })])).toBeNull();
    expect(estimateVialSupply([log({ totalAmount: undefined })])).toBeNull();
    expect(estimateVialSupply([log({ totalAmount: '0' })])).toBeNull();
    expect(estimateVialSupply([log({ totalAmountUnit: undefined })])).toBeNull();
  });

  it('subtracts one dose from a 5 mg vial exactly', () => {
    const r = estimateVialSupply([log()])!;
    expect(r.amountLeftExact).toBe('4.75');
    expect(r.dosesLeft).toBe(19);
    expect(r.loggedDoseCount).toBe(1);
  });

  it('is exact where floats drift (0.1 mg doses from 0.3 mg)', () => {
    const l = (n: number) => log({ totalAmount: '0.3', doseValue: 0.1, timestamp: `2026-11-2${n}` });
    const r = estimateVialSupply([l(3), l(2)])!;
    expect(r.amountLeftExact).toBe('0.1');
    expect(r.dosesLeft).toBe(1);
    expect(estimateVialSupply([l(3), l(2), l(1)])!.dosesLeft).toBe(0);
  });

  it('converts mcg doses against an mg vial', () => {
    const r = estimateVialSupply([log({ doseValue: 250, unit: 'mcg' })])!;
    expect(r.amountLeftExact).toBe('4.75');
    expect(r.dosesLeft).toBe(19);
  });

  it('floors partial doses and never goes below zero', () => {
    expect(estimateVialSupply([log({ doseValue: 2 })])!.dosesLeft).toBe(1);
    const over = estimateVialSupply([log({ doseValue: 3 }), log({ doseValue: 3 })])!;
    expect(over.amountLeftExact).toBe('0');
    expect(over.dosesLeft).toBe(0);
  });

  it('ignores logs from a different substance or vial size', () => {
    const r = estimateVialSupply([log(), log({ substanceName: 'TB-500' }), log({ totalAmount: '10' })])!;
    expect(r.loggedDoseCount).toBe(1);
    expect(r.amountLeftExact).toBe('4.75');
  });

  it('returns null when dose and vial units cannot be compared', () => {
    expect(estimateVialSupply([log({ unit: 'mL' })])).toBeNull();
  });
});
