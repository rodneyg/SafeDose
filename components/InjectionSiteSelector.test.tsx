jest.mock('lucide-react-native', () => ({ AlertTriangle: 'AlertTriangle' }));
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import InjectionSiteSelector from './InjectionSiteSelector';
import { DoseLog, InjectionSite } from '../types/doseLog';

const NOW = new Date('2026-11-21T12:00:00.000Z');

function dose(injectionSite: InjectionSite, daysAgo: number): DoseLog {
  return {
    id: `${injectionSite}-${daysAgo}`,
    substanceName: 'Test medicine',
    doseValue: 1,
    unit: 'mg',
    calculatedVolume: 0.1,
    injectionSite,
    timestamp: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function renderSelector(overrides: Partial<React.ComponentProps<typeof InjectionSiteSelector>> = {}) {
  const props: React.ComponentProps<typeof InjectionSiteSelector> = {
    doseHistory: [],
    selectedSite: 'abdomen_L',
    onSiteSelect: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };

  return { props, screen: render(<InjectionSiteSelector {...props} />) };
}

describe('InjectionSiteSelector', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suggests the least recently used site only when no site is selected', () => {
    const onSiteSelect = jest.fn();
    const { screen } = renderSelector({ selectedSite: null, onSiteSelect });

    expect(onSiteSelect).toHaveBeenCalledWith('abdomen_L');

    screen.rerender(
      <InjectionSiteSelector
        doseHistory={[]}
        selectedSite="thigh_R"
        onSiteSelect={onSiteSelect}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    expect(onSiteSelect).toHaveBeenCalledTimes(1);
  });

  it('renders all sites, reports their last-used age, and selects a pressed site', () => {
    const onSiteSelect = jest.fn();
    const history = [
      dose('abdomen_L', 0),
      dose('abdomen_R', 1),
      dose('thigh_L', 3),
      dose('thigh_R', 14),
    ];
    const { screen } = renderSelector({ doseHistory: history, onSiteSelect });

    for (const label of [
      'Abdomen Left', 'Abdomen Right', 'Thigh Left', 'Thigh Right',
      'Glute Left', 'Glute Right', 'Arm Left', 'Arm Right',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Yesterday')).toBeTruthy();
    expect(screen.getByText('3 days ago')).toBeTruthy();
    expect(screen.getByText('2w ago')).toBeTruthy();

    fireEvent.press(screen.getByText('Arm Right'));
    expect(onSiteSelect).toHaveBeenCalledWith('arm_R');
  });

  it('shows a singular rotation warning for a site used one day ago', async () => {
    const { screen } = renderSelector({
      selectedSite: 'abdomen_R',
      doseHistory: [dose('abdomen_R', 1)],
    });

    expect(await screen.findByText(
      'Consider rotating to reduce scar tissue. Last used 1 day ago.',
    )).toBeTruthy();
  });

  it('uses a plural warning and removes it when the selected site is not recent', async () => {
    const props = {
      doseHistory: [dose('thigh_L', 3)],
      onSiteSelect: jest.fn(),
      onConfirm: jest.fn(),
      onCancel: jest.fn(),
    };
    const screen = render(
      <InjectionSiteSelector {...props} selectedSite="thigh_L" />,
    );

    expect(await screen.findByText(
      'Consider rotating to reduce scar tissue. Last used 3 days ago.',
    )).toBeTruthy();

    screen.rerender(<InjectionSiteSelector {...props} selectedSite="arm_L" />);
    await waitFor(() => {
      expect(screen.queryByText(/Consider rotating/)).toBeNull();
    });
  });

  it('disables Continue without a selection and invokes both actions when enabled', () => {
    const disabled = renderSelector({ selectedSite: null });
    const disabledButtons = disabled.screen.UNSAFE_getAllByType(TouchableOpacity);
    expect(disabledButtons[disabledButtons.length - 1].props.disabled).toBe(true);

    const enabled = renderSelector();
    fireEvent.press(enabled.screen.getByText('Cancel'));
    fireEvent.press(enabled.screen.getByText('Continue'));
    expect(enabled.props.onCancel).toHaveBeenCalledTimes(1);
    expect(enabled.props.onConfirm).toHaveBeenCalledTimes(1);
    const enabledButtons = enabled.screen.UNSAFE_getAllByType(TouchableOpacity);
    expect(enabledButtons[enabledButtons.length - 1].props.disabled).toBe(false);
  });
});
