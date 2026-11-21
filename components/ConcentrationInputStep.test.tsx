import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ConcentrationInputStep from './ConcentrationInputStep';
import { parseDoseInput, validateUnitCompatibility } from '../lib/dosing';

jest.mock('../lib/utils', () => ({ isMobileWeb: false }));

describe('ConcentrationInputStep', () => {
  it('allows compatible mass units and blocks incompatible units/ml for mg doses', () => {
    const setConcentrationUnit = jest.fn();

    const screen = render(
      <ConcentrationInputStep
        concentrationAmount="10"
        setConcentrationAmount={jest.fn()}
        concentrationUnit="mg/ml"
        setConcentrationUnit={setConcentrationUnit}
        setConcentrationHint={jest.fn()}
        concentrationHint={null}
        doseUnit="mg"
        formError={null}
      />,
    );

    expect(screen.getByText(/For mg dose, use mg\/ml or mcg\/ml\./)).toBeTruthy();

    fireEvent.press(screen.getByText('mcg/ml'));
    expect(setConcentrationUnit).toHaveBeenCalledWith('mcg/ml');

    setConcentrationUnit.mockClear();
    fireEvent.press(screen.getByText('units/ml'));
    expect(setConcentrationUnit).not.toHaveBeenCalled();
  });

  it('auto-switches an incompatible concentration unit to match doseUnit and sets a hint', () => {
    const setConcentrationUnit = jest.fn();
    const setConcentrationHint = jest.fn();

    render(
      <ConcentrationInputStep
        concentrationAmount="100"
        setConcentrationAmount={jest.fn()}
        concentrationUnit="mg/ml"
        setConcentrationUnit={setConcentrationUnit}
        setConcentrationHint={setConcentrationHint}
        concentrationHint={null}
        doseUnit="units"
        formError={null}
      />,
    );

    expect(setConcentrationUnit).toHaveBeenCalledWith('units/ml');
    expect(setConcentrationHint).toHaveBeenCalledWith(
      'Unit automatically changed to match dose unit (units)',
    );
  });

  it('preserves cross-scale mass compatibility (mcg dose with mg/ml concentration) without auto-switching', () => {
    const setConcentrationUnit = jest.fn();
    const setConcentrationHint = jest.fn();

    render(
      <ConcentrationInputStep
        concentrationAmount="5"
        setConcentrationAmount={jest.fn()}
        concentrationUnit="mg/ml"
        setConcentrationUnit={setConcentrationUnit}
        setConcentrationHint={setConcentrationHint}
        concentrationHint={null}
        doseUnit="mcg"
        formError={null}
      />,
    );

    expect(setConcentrationUnit).not.toHaveBeenCalled();
    expect(setConcentrationHint).not.toHaveBeenCalled();
  });

  it('allows selecting any concentration unit for direct mL doses', () => {
    const setConcentrationUnit = jest.fn();

    const screen = render(
      <ConcentrationInputStep
        concentrationAmount="10"
        setConcentrationAmount={jest.fn()}
        concentrationUnit="mg/ml"
        setConcentrationUnit={setConcentrationUnit}
        setConcentrationHint={jest.fn()}
        concentrationHint={null}
        doseUnit="mL"
        formError={null}
      />,
    );

    fireEvent.press(screen.getByText('mcg/ml'));
    fireEvent.press(screen.getByText('units/ml'));
    fireEvent.press(screen.getByText('mg/ml'));

    expect(setConcentrationUnit.mock.calls).toEqual([['mcg/ml'], ['units/ml'], ['mg/ml']]);
  });

  it('disables mg/ml and mcg/ml when doseUnit is units', () => {
    const setConcentrationUnit = jest.fn();

    const screen = render(
      <ConcentrationInputStep
        concentrationAmount="100"
        setConcentrationAmount={jest.fn()}
        concentrationUnit="units/ml"
        setConcentrationUnit={setConcentrationUnit}
        setConcentrationHint={jest.fn()}
        concentrationHint={null}
        doseUnit="units"
        formError={null}
      />,
    );

    fireEvent.press(screen.getByText('mg/ml'));
    fireEvent.press(screen.getByText('mcg/ml'));
    expect(setConcentrationUnit).not.toHaveBeenCalled();
    expect(screen.getByText(/For units dose, use units\/ml\./)).toBeTruthy();
  });

  it('clears concentrationHint when the user edits the concentration amount and displays validation errors', () => {
    const setConcentrationAmount = jest.fn();
    const setConcentrationHint = jest.fn();

    const screen = render(
      <ConcentrationInputStep
        concentrationAmount="10"
        setConcentrationAmount={setConcentrationAmount}
        concentrationUnit="mg/ml"
        setConcentrationUnit={jest.fn()}
        setConcentrationHint={setConcentrationHint}
        concentrationHint="Unit automatically changed to match dose unit (mg)"
        doseUnit="mg"
        formError="Please enter a valid concentration amount greater than 0"
      />,
    );

    expect(screen.getByText('Unit automatically changed to match dose unit (mg)')).toBeTruthy();
    expect(screen.getByText('Please enter a valid concentration amount greater than 0')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('e.g., 10'), '25');
    expect(setConcentrationAmount).toHaveBeenCalledWith('25');
    expect(setConcentrationHint).toHaveBeenCalledWith(null);
  });

  it('rejects invalid concentration amounts and clears formError once a positive value is entered', () => {
    function Harness() {
      const [amount, setAmount] = useState('');
      const [unit, setUnit] = useState<'mg/ml' | 'mcg/ml' | 'units/ml'>('mg/ml');
      const [hint, setHint] = useState<string | null>(null);
      const [formError, setFormError] = useState<string | null>(null);

      const handleAmountChange = (next: string) => {
        setAmount(next);
        const numeric = parseDoseInput(next);
        if (!next || Number.isNaN(numeric) || numeric <= 0) {
          setFormError('Please enter a valid concentration amount greater than 0');
          return;
        }
        const compatibility = validateUnitCompatibility('mg', unit);
        setFormError(compatibility.isValid ? null : compatibility.errorMessage);
      };

      return (
        <ConcentrationInputStep
          concentrationAmount={amount}
          setConcentrationAmount={handleAmountChange}
          concentrationUnit={unit}
          setConcentrationUnit={setUnit}
          setConcentrationHint={setHint}
          concentrationHint={hint}
          doseUnit="mg"
          formError={formError}
        />
      );
    }

    const screen = render(<Harness />);
    const input = screen.getByPlaceholderText('e.g., 10');

    for (const invalid of ['0', '-2', '10mg/ml', 'abc']) {
      fireEvent.changeText(input, invalid);
      expect(screen.getByText('Please enter a valid concentration amount greater than 0')).toBeTruthy();
    }

    fireEvent.changeText(input, '5');
    expect(screen.queryByText('Please enter a valid concentration amount greater than 0')).toBeNull();
  });
});
