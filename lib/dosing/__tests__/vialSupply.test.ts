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

  it('converts mg doses against an mcg vial and handles units vials', () => {
    const r = estimateVialSupply([log({ totalAmount: '5000', totalAmountUnit: 'mcg', doseValue: 0.25, unit: 'mg' })])!;
    expect(r.amountLeftExact).toBe('4750');
    expect(r.dosesLeft).toBe(19);
    const u = estimateVialSupply([log({ totalAmount: '100', totalAmountUnit: 'units', doseValue: 10, unit: 'units' })])!;
    expect(u.dosesLeft).toBe(9);
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

  it('treats unreadable totals and zero doses as no vial context', () => {
    expect(estimateVialSupply([log({ totalAmount: 'abc' })])).toBeNull();
    expect(estimateVialSupply([log({ totalAmount: '-1' })])).toBeNull();
    expect(estimateVialSupply([log({ doseValue: 0 })])).toBeNull();
    expect(estimateVialSupply([log({ doseValue: -1 })])).toBeNull();
  });

  it('rejects mass doses for unit-counted vials', () => {
    expect(estimateVialSupply([
      log({ totalAmount: '100', totalAmountUnit: 'units', doseValue: 1, unit: 'mg' }),
    ])).toBeNull();
  });

  it('ignores older logs with a different or invalid vial unit', () => {
    const r = estimateVialSupply([
      log(),
      log({ totalAmount: '5000', totalAmountUnit: 'mcg' }),
      log({ totalAmount: '-5' }),
    ])!;
    expect(r.loggedDoseCount).toBe(1);
    expect(r.amountLeftExact).toBe('4.75');
  });

  it('matches vials with no substance name and skips logs without a total', () => {
    const noName = (over: Partial<VialSupplyLog> = {}) => log({ substanceName: undefined, ...over });
    const r = estimateVialSupply([noName(), noName({ totalAmount: undefined }), noName({ medicationInputType: 'concentration' })])!;
    expect(r.loggedDoseCount).toBe(1);
    expect(estimateVialSupply([noName(), noName({ substanceName: '  ' })])!.loggedDoseCount).toBe(2);
  });
});
