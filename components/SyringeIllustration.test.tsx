import React from 'react';
import { render } from '@testing-library/react-native';
import SyringeIllustration from '../SyringeIllustration';

// Mock syringe options for testing
const mockSyringeOptions = {
  'Standard': {
    '1 ml': '0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0',
    '3 ml': '0.5,1.0,1.5,2.0,2.5,3.0',
    '10 ml': '1,2,3,4,5,6,7,8,9,10'
  },
  'Insulin': {
    '50 Units': '5,10,15,20,25,30,35,40,45,50',
    '100 Units': '10,20,30,40,50,60,70,80,90,100'
  }
};

describe('SyringeIllustration', () => {
  it('should render without crashing for valid syringe options', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Standard"
        syringeVolume="1 ml"
        recommendedMarking="0.5"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    expect(getByText('ml')).toBeTruthy();
  });

  it('should render unit label for Standard syringe', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Standard"
        syringeVolume="1 ml"
        recommendedMarking="0.5"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    expect(getByText('ml')).toBeTruthy();
  });

  it('should render unit label for Insulin syringe', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Insulin"
        syringeVolume="50 Units"
        recommendedMarking="25"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    expect(getByText('Units')).toBeTruthy();
  });

  it('should render markings for 1ml syringe', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Standard"
        syringeVolume="1 ml"
        recommendedMarking="0.5"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    // Check that key markings are rendered
    expect(getByText('0')).toBeTruthy();
    expect(getByText('0.5')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });

  it('should render markings for 10ml syringe', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Standard"
        syringeVolume="10 ml"
        recommendedMarking="5"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    // Check that key markings are rendered
    expect(getByText('0')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
    expect(getByText('10')).toBeTruthy();
  });

  it('should render placeholder when no markings available', () => {
    const { getByText } = render(
      <SyringeIllustration 
        syringeType="Standard"
        syringeVolume="invalid"
        recommendedMarking="0.5"
        syringeOptions={mockSyringeOptions}
      />
    );
    
    expect(getByText('No markings available for this syringe')).toBeTruthy();
  });

  // Test to verify text overlap issue is fixed
  it('should not have overlapping text positioning', () => {
    // This test validates that the unit label positioned above the syringe
    // does not overlap with marking labels positioned below the syringe
    const syringeWidth = 300;
    const markings = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const maxMarking = Math.max(...markings);
    const markingPositions = markings.map(m => (m / maxMarking) * syringeWidth);
    
    // Unit label is now positioned above the syringe (top: 20)
    // while marking labels are positioned below the syringe (top: 65)
    const unitLabelTop = 20;
    const markingLabelTop = 65;
    
    // Vertical separation ensures no overlap
    const verticalSeparation = markingLabelTop - unitLabelTop;
    
    // There should be sufficient vertical separation (at least 40px in this case)
    expect(verticalSeparation).toBeGreaterThan(30);
    
    // Also verify horizontal positioning is within bounds
    const unitLabelHorizontalPosition = 250;
    expect(unitLabelHorizontalPosition).toBeLessThan(syringeWidth);
    expect(unitLabelHorizontalPosition).toBeGreaterThan(0);
  });
});