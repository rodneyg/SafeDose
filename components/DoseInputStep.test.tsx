import React, { useState } from 'react';
import { Keyboard } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import DoseInputStep from './DoseInputStep';
import { parseDoseInput } from '../lib/dosing';

jest.mock('../lib/utils', () => ({ isMobileWeb: false }));

describe('DoseInputStep', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders dose input, all four unit buttons, and selected unit styling', () => {
    const screen = render(
      <DoseInputStep
        dose="25"
        setDose={jest.fn()}
        unit="mcg"
        setUnit={jest.fn()}
        formError={null}
      />,
    );

    expect(screen.getByText('Prescribed Dose')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g., 100').props.value).toBe('25');
    expect(screen.getByText('mg')).toBeTruthy();
    expect(screen.getByText('mcg')).toBeTruthy();
    expect(screen.getByText('units')).toBeTruthy();
    expect(screen.getByText('mL')).toBeTruthy();
    expect(screen.getByText('mcg').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF', fontWeight: 'bold' })]),
    );
    expect(screen.getByText('mg').props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#FFFFFF' })]),
    );
    expect(screen.queryByText(/valid dose/i)).toBeNull();
  });

  it('calls setDose and validateInput when dose text changes', () => {
    const setDose = jest.fn();
    const validateInput = jest.fn().mockReturnValue(true);

    const screen = render(
      <DoseInputStep
        dose=""
        setDose={setDose}
        unit="mg"
        setUnit={jest.fn()}
        formError={null}
        validateInput={validateInput}
      />,
    );

    fireEvent.changeText(screen.getByPlaceholderText('e.g., 100'), '2.5');

    expect(setDose).toHaveBeenCalledWith('2.5');
    expect(validateInput).toHaveBeenCalledWith('2.5', 'mg');
  });

  it('selects each unit and re-validates only when a dose value is present', () => {
    const setUnit = jest.fn();
    const validateInput = jest.fn().mockReturnValue(true);

    const emptyScreen = render(
      <DoseInputStep
        dose=""
        setDose={jest.fn()}
        unit="mg"
        setUnit={setUnit}
        formError={null}
        validateInput={validateInput}
      />,
    );

    fireEvent.press(emptyScreen.getByText('units'));
    expect(setUnit).toHaveBeenCalledWith('units');
    expect(validateInput).not.toHaveBeenCalled();

    setUnit.mockClear();

    const filledScreen = render(
      <DoseInputStep
        dose="10"
        setDose={jest.fn()}
        unit="mg"
        setUnit={setUnit}
        formError={null}
        validateInput={validateInput}
      />,
    );

    fireEvent.press(filledScreen.getByText('mcg'));
    fireEvent.press(filledScreen.getByText('units'));
    fireEvent.press(filledScreen.getByText('mL'));
    fireEvent.press(filledScreen.getByText('mg'));

    expect(setUnit.mock.calls).toEqual([['mcg'], ['units'], ['mL'], ['mg']]);
    expect(validateInput.mock.calls).toEqual([
      ['10', 'mcg'],
      ['10', 'units'],
      ['10', 'mL'],
      ['10', 'mg'],
    ]);
  });

  it('rejects invalid dose inputs through validation and displays formError until corrected', () => {
    function Harness() {
      const [dose, setDose] = useState('');
      const [unit, setUnit] = useState<'mg' | 'mcg' | 'units' | 'mL'>('mg');
      const [formError, setFormError] = useState<string | null>(null);

      const validateInput = (value: string) => {
        const parsed = parseDoseInput(value);
        if (!value || Number.isNaN(parsed) || parsed <= 0) {
          setFormError('Please enter a valid dose amount greater than 0');
          return false;
        }
        setFormError(null);
        return true;
      };

      return (
        <DoseInputStep
          dose={dose}
          setDose={setDose}
          unit={unit}
          setUnit={setUnit}
          formError={formError}
          validateInput={validateInput}
        />
      );
    }

    const screen = render(<Harness />);
    const input = screen.getByPlaceholderText('e.g., 100');

    for (const badValue of ['0', '-5', 'abc', '10mg', '']) {
      fireEvent.changeText(input, badValue);
      expect(screen.getByText('Please enter a valid dose amount greater than 0')).toBeTruthy();
    }

    fireEvent.changeText(input, '0.25');
    expect(screen.queryByText('Please enter a valid dose amount greater than 0')).toBeNull();
  });

  it('dismisses the keyboard when submitting the dose input', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});

    const screen = render(
      <DoseInputStep
        dose="5"
        setDose={jest.fn()}
        unit="mg"
        setUnit={jest.fn()}
        formError={null}
      />,
    );

    fireEvent(screen.getByPlaceholderText('e.g., 100'), 'submitEditing');
    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });
});
