import { getSyringeMarkings, insulinVolumes, standardVolumes } from '../syringes';
import type { SyringeSelection } from '../syringes';

describe('getSyringeMarkings', () => {
  const u100Cases = [
    ['0.3 ml', '5,10,15,20,25,30'],
    ['0.5 ml', '5,10,15,20,25,30,35,40,45,50'],
    ['1 ml', '10,20,30,40,50,60,70,80,90,100'],
  ];

  it.each(u100Cases)('returns U-100 markings for %s', (volume, expected) => {
    expect(getSyringeMarkings({ type: 'Insulin', volume, insulinScale: 'U-100' }))
      .toBe(expected);
  });

  it('defaults an omitted or empty insulin scale to U-100', () => {
    expect(getSyringeMarkings({ type: 'Insulin', volume: '0.3 ml' }))
      .toBe('5,10,15,20,25,30');
    expect(getSyringeMarkings({ type: 'Insulin', volume: '0.3 ml', insulinScale: '' }))
      .toBe('5,10,15,20,25,30');
  });

  it.each([
    ['0.5 ml', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20'],
    ['1 ml', '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40'],
  ])('returns U-40 markings for %s', (volume, expected) => {
    expect(getSyringeMarkings({ type: 'Insulin', volume, insulinScale: 'U-40' }))
      .toBe(expected);
  });

  const standardCases = [
    ['1 ml', '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0'],
    ['3 ml', '0.5,1.0,1.5,2.0,2.5,3.0'],
    ['5 ml', '1.0,2.0,3.0,4.0,5.0'],
  ];

  it.each(standardCases)('returns standard markings for %s regardless of insulin scale', (volume, expected) => {
    expect(getSyringeMarkings({ type: 'Standard', volume })).toBe(expected);
    expect(getSyringeMarkings({ type: 'Standard', volume, insulinScale: 'U-40' }))
      .toBe(expected);
  });

  const unsupported: [string, SyringeSelection][] = [
    ['an unrecognized insulin scale', { type: 'Insulin', volume: '1 ml', insulinScale: 'U-200' }],
    ['an unsupported U-100 volume', { type: 'Insulin', volume: '3 ml', insulinScale: 'U-100' }],
    ['an unsupported U-40 volume', { type: 'Insulin', volume: '0.3 ml', insulinScale: 'U-40' }],
    ['an unsupported standard volume', { type: 'Standard', volume: '0.5 ml' }],
  ];

  it.each(unsupported)('returns undefined for %s', (_label, selection) => {
    expect(getSyringeMarkings(selection)).toBeUndefined();
  });

  it('returns undefined for an unrecognized syringe type at runtime', () => {
    const selection = { type: 'Other', volume: '1 ml' } as unknown as SyringeSelection;
    expect(getSyringeMarkings(selection)).toBeUndefined();
  });
});

it('lists supported capacities in display order', () => {
  expect(insulinVolumes).toEqual(['0.3 ml', '0.5 ml', '1 ml']);
  expect(standardVolumes).toEqual(['1 ml', '3 ml', '5 ml']);
});
