import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BeforeFirstScanScreen from './BeforeFirstScanScreen';

describe('BeforeFirstScanScreen', () => {
  const props = () => ({ onContinue: jest.fn(), onBack: jest.fn(), onDontShowAgain: jest.fn() });

  it('renders all preparation materials and the baseline requirement', () => {
    const screen = render(React.createElement(BeforeFirstScanScreen, props()));
    for (const text of [
      'Before you scan',
      "Let's make sure you have what you need",
      'Medication vial with clear labels',
      'Syringe with visible markings',
      'Prescription box or label',
      'Have these ready (more items = better results):',
    ]) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.getByText(/requires at least one solid baseline reference/)).toBeTruthy();
    expect(screen.getByText(/Clear text and markings/)).toBeTruthy();
  });

  it('wires Continue and Back and hides opt-out on the first viewing', () => {
    const handlers = props();
    const screen = render(React.createElement(BeforeFirstScanScreen, handlers));
    expect(screen.queryByLabelText("Don't show this again")).toBeNull();
    fireEvent.press(screen.getByLabelText('Continue to scan'));
    expect(handlers.onContinue).toHaveBeenCalledTimes(1);
    expect(handlers.onBack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onDontShowAgain).not.toHaveBeenCalled();
  });

  it('offers a working opt-out on subsequent viewings only with a handler', () => {
    const handlers = props();
    const screen = render(React.createElement(BeforeFirstScanScreen, { ...handlers, showDontShowAgain: true }));
    fireEvent.press(screen.getByLabelText("Don't show this again"));
    expect(handlers.onDontShowAgain).toHaveBeenCalledTimes(1);
    expect(handlers.onContinue).not.toHaveBeenCalled();
    screen.rerender(React.createElement(BeforeFirstScanScreen, { ...handlers, showDontShowAgain: true, onDontShowAgain: undefined }));
    expect(screen.queryByLabelText("Don't show this again")).toBeNull();
  });
});
