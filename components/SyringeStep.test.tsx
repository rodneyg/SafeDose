import React from 'react';
import { render } from '@testing-library/react-native';
import SyringeStep from './SyringeStep';

// Mock the utils module 
jest.mock('../lib/utils', () => ({
  syringeOptions: {
    Insulin: {
      '0.3 ml': '5,10,15,20,25,30',
      '0.5 ml': '5,10,15,20,25,30,35,40,45,50',
      '1 ml': '10,20,30,40,50,60,70,80,90,100',
    },
    Standard: {
      '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
      '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
      '5 ml': '1.0,2.0,3.0,4.0,5.0',
    },
  },
  insulinVolumes: ['0.3 ml', '0.5 ml', '1 ml'],
  standardVolumes: ['1 ml', '3 ml', '5 ml'],
  isMobileWeb: false,
}));

describe('SyringeStep Smart Defaults', () => {
  const mockSetManualSyringe = jest.fn();
  const mockSetSyringeHint = jest.fn();

  const defaultProps = {
    manualSyringe: { type: 'Standard' as const, volume: '3 ml' },
    setManualSyringe: mockSetManualSyringe,
    setSyringeHint: mockSetSyringeHint,
    syringeHint: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should suggest insulin syringe for 500mcg dose', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={500}
        unit="mcg"
        medicationInputType="totalAmount"
      />
    );

    // Should call setManualSyringe with insulin syringe for 500mcg
    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Insulin',
      volume: '1 ml',
    });
  });

  it('should suggest insulin syringe for small mcg doses (≤1000mcg)', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={800}
        unit="mcg"
        medicationInputType="concentration"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Insulin',
      volume: '1 ml',
    });
  });

  it('should suggest 5ml standard syringe for 100mg TRT dose', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={100}
        unit="mg"
        medicationInputType="concentration"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Standard',
      volume: '5 ml',
    });
  });

  it('should suggest insulin for medium mcg dose with total amount input', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={2000}
        unit="mcg"
        medicationInputType="totalAmount"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Insulin',
      volume: '1 ml',
    });
  });

  it('should suggest standard 1ml for medium mcg dose with concentration input', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={2000}
        unit="mcg"
        medicationInputType="concentration"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Standard',
      volume: '1 ml',
    });
  });

  it('should suggest 3ml standard for medium mg doses', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={25}
        unit="mg"
        medicationInputType="concentration"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Standard',
      volume: '3 ml',
    });
  });

  it('should prefer insulin syringe for insulin units', () => {
    render(
      <SyringeStep
        {...defaultProps}
        doseValue={50}
        unit="units"
        concentrationUnit="units/ml"
      />
    );

    expect(mockSetManualSyringe).toHaveBeenCalledWith({
      type: 'Insulin',
      volume: '1 ml',
    });
  });

  it('should handle edge case of no context gracefully', () => {
    render(
      <SyringeStep
        {...defaultProps}
        manualSyringe={{ type: 'Standard', volume: 'invalid' }}
      />
    );

    // Should fall back to default valid syringe
    expect(mockSetManualSyringe).toHaveBeenCalled();
  });
});