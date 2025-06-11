/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import ReferenceScreen from '../app/(tabs)/reference';

// Mock Firebase
jest.mock('../lib/firebase', () => ({
  db: {},
}));

// Mock Firebase/firestore methods
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
}));

// Mock the utility function
jest.mock('../lib/utils', () => ({
  isMobileWeb: false,
}));

describe('ReferenceScreen', () => {
  it('renders without crashing', () => {
    const { getByText } = render(<ReferenceScreen />);
    
    // Check for the main title
    expect(getByText('Common Peptide Doses')).toBeTruthy();
    
    // Check for disclaimer
    expect(getByText(/This information is for educational purposes only/)).toBeTruthy();
    
    // Check for some compound names
    expect(getByText('BPC-157')).toBeTruthy();
    expect(getByText('CJC-1295')).toBeTruthy();
    expect(getByText('TB-500')).toBeTruthy();
    
    // Check for feedback button
    expect(getByText('Suggest a compound to add')).toBeTruthy();
  });

  it('displays popular badges for trending compounds', () => {
    const { getAllByText } = render(<ReferenceScreen />);
    
    // Check that "Most Searched" badges appear for popular compounds
    const badges = getAllByText('Most Searched');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('displays dosage information correctly', () => {
    const { getByText } = render(<ReferenceScreen />);
    
    // Check for specific dosage ranges
    expect(getByText('200–500mcg daily')).toBeTruthy();
    expect(getByText('1000mcg 2–3x/week')).toBeTruthy();
    expect(getByText('2.0–2.5mg weekly')).toBeTruthy();
  });

  it('displays use case notes', () => {
    const { getByText } = render(<ReferenceScreen />);
    
    // Check for specific use cases
    expect(getByText('Often used for injury healing')).toBeTruthy();
    expect(getByText('Growth hormone support')).toBeTruthy();
    expect(getByText('Tissue and injury recovery')).toBeTruthy();
  });
});