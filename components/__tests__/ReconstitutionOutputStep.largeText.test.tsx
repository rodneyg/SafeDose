import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ReconstitutionOutputStep from '../ReconstitutionOutputStep';

jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, key) => String(key) }));

const result: any = { bacWaterToAdd: 2, concentration: 2.5, injectionVolume: 0.1 };

// Dynamic Type grows Text but not its parent row, so label and value
// must be able to shrink and wrap instead of running off the card.
it('lets summary rows and action labels wrap at large text sizes', () => {
  render(
    <ReconstitutionOutputStep
      result={result}
      peptideAmount="5"
      peptideUnit="mg"
      targetDose="250"
      targetDoseUnit="mcg"
      preferredVolume="0.1"
      onUseDoseCalculator={jest.fn()}
      onStartOver={jest.fn()}
    />
  );
  const label = StyleSheet.flatten(screen.getByText('Target dose:').props.style);
  const value = StyleSheet.flatten(screen.getByText('250 mcg').props.style);
  const row = StyleSheet.flatten(screen.getByText('Target dose:').parent!.props.style);
  expect(label.flexShrink).toBe(1);
  expect(value.flexShrink).toBe(1);
  expect(row.flexWrap).toBe('wrap');
  for (const t of ['Use in Dose Calculator', 'Start Over']) {
    expect(StyleSheet.flatten(screen.getByText(t).props.style).flexShrink).toBe(1);
  }
});
