import { Exact } from '../exact';
import { getMarkingGuidance } from '../markings';

describe('getMarkingGuidance', () => {
  it.each([0.2, 0.2099, 0.21])(
    'omits precision guidance at %s mL when the nearest mark is within 0.01 mL',
    (volume) => {
      expect(getMarkingGuidance(volume, 'Standard', '0.1,0.2,0.3')).toEqual({
        recommendedMarking: String(volume),
        precisionMessage: null,
      });
    },
  );

  it('adds precision guidance just beyond the 0.01 mL threshold', () => {
    expect(getMarkingGuidance(0.2101, 'Standard', '0.1,0.2,0.3')).toEqual({
      recommendedMarking: '0.2101',
      precisionMessage: 'Draw to 0.21 ml, which is between the 0.2 ml and 0.3 ml marks.',
    });
  });

  it('finds the surrounding marks in an unsorted list, including a zero lower mark', () => {
    expect(getMarkingGuidance(0.125, 'Standard', '0.4,0,0.2')).toEqual({
      recommendedMarking: '0.125',
      precisionMessage: 'Draw to 0.13 ml, which is between the 0 ml and 0.2 ml marks.',
    });
  });

  it('reports the first mark when the volume is below the scale', () => {
    expect(getMarkingGuidance(0.05, 'Standard', '0.4,0.1,0.2')).toEqual({
      recommendedMarking: '0.05',
      precisionMessage: 'Draw to 0.05 ml, which is below the first marking at 0.1 ml.',
    });
  });

  it('reports the last mark when the volume is above the scale', () => {
    expect(getMarkingGuidance(0.45, 'Standard', '0.2,0.4,0.1')).toEqual({
      recommendedMarking: '0.45',
      precisionMessage: 'Draw to 0.45 ml, which is above the 0.4 ml mark.',
    });
  });

  it('uses the default insulin scale to report a mark in units', () => {
    expect(getMarkingGuidance(0.145, 'Insulin', '10,15,20')).toEqual({
      recommendedMarking: '14.5',
      precisionMessage: 'Draw to 14.50 units, which is between the 10 units and 15 units marks.',
    });
  });

  it('uses a supplied insulin scale with an exact volume', () => {
    expect(getMarkingGuidance(new Exact('0.3125'), 'Insulin', '10,15,20', 40)).toEqual({
      recommendedMarking: '12.5',
      precisionMessage: 'Draw to 12.50 units, which is between the 10 units and 15 units marks.',
    });
  });
});
