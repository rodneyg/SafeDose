import { fireEvent, render } from '@testing-library/react-native';
import InjectionSiteSelector from './InjectionSiteSelector';
import type { DoseLog, InjectionSite } from '../types/doseLog';

jest.mock('lucide-react-native', () => ({ AlertTriangle: 'AlertTriangle' }));
jest.mock('react-native-css-interop/jsx-runtime', () => jest.requireActual('react/jsx-runtime'));

const now = new Date('2026-01-21T12:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;
const rotationWarning = /Consider rotating to reduce scar tissue/;

function dose(injectionSite: InjectionSite, daysAgo: number): DoseLog {
  return {
    id: `${injectionSite}-${daysAgo}`,
    substanceName: 'Test medicine',
    doseValue: 1,
    unit: 'mg',
    calculatedVolume: 0.1,
    injectionSite,
    timestamp: new Date(now.getTime() - daysAgo * dayMs).toISOString(),
  };
}

function callbacks() {
  return {
    onSiteSelect: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };
}

describe('InjectionSiteSelector rotation', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hides the rotation warning when the selected site is cleared', () => {
    const props = { ...callbacks(), doseHistory: [dose('thigh_L', 1)] };
    const { getByText, queryByText, rerender } = render(
      <InjectionSiteSelector {...props} selectedSite="thigh_L" />,
    );

    expect(getByText('Consider rotating to reduce scar tissue. Last used 1 day ago.')).toBeTruthy();
    rerender(<InjectionSiteSelector {...props} selectedSite={null} />);
    expect(queryByText(rotationWarning)).toBeNull();
  });

  it('suggests the site with the oldest last use when all sites have been used', () => {
    const props = callbacks();
    const doseHistory = [
      dose('abdomen_L', 1),
      dose('abdomen_R', 2),
      dose('thigh_L', 3),
      dose('thigh_R', 4),
      dose('glute_L', 5),
      dose('glute_R', 6),
      dose('arm_L', 12),
      dose('arm_R', 7),
      dose('arm_R', 20),
    ];

    render(<InjectionSiteSelector {...props} doseHistory={doseHistory} selectedSite={null} />);

    expect(props.onSiteSelect).toHaveBeenCalledTimes(1);
    expect(props.onSiteSelect).toHaveBeenCalledWith('arm_L');
  });

  it('ignores a Continue press until a site is selected', () => {
    const props = { ...callbacks(), doseHistory: [] };
    const { getByText, rerender } = render(
      <InjectionSiteSelector {...props} selectedSite={null} />,
    );

    fireEvent.press(getByText('Continue'));
    expect(props.onConfirm).not.toHaveBeenCalled();

    rerender(<InjectionSiteSelector {...props} selectedSite="abdomen_L" />);
    fireEvent.press(getByText('Continue'));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it.each([0, 6])('shows a rotation warning for a site used %i days ago', (daysAgo) => {
    const { getByText } = render(
      <InjectionSiteSelector {...callbacks()} doseHistory={[dose('thigh_L', daysAgo)]} selectedSite="thigh_L" />,
    );

    expect(getByText(`Consider rotating to reduce scar tissue. Last used ${daysAgo} days ago.`)).toBeTruthy();
  });

  it('does not warn at the seven-day cutoff', () => {
    const { queryByText } = render(
      <InjectionSiteSelector {...callbacks()} doseHistory={[dose('thigh_L', 7)]} selectedSite="thigh_L" />,
    );

    expect(queryByText(rotationWarning)).toBeNull();
  });
});

 describe('calendar day labels', () => {
  it('counts a use before midnight as yesterday after midnight', () => {
    const beforeMidnight = new Date(2026, 0, 20, 20);
    jest.useFakeTimers({ now: new Date(2026, 0, 21, 8) });
    const { getByText } = render(
      <InjectionSiteSelector {...callbacks()} doseHistory={[{
        ...dose('thigh_L', 0), timestamp: beforeMidnight.toISOString(),
      }]} selectedSite="thigh_L" />,
    );
    expect(getByText('Yesterday')).toBeTruthy();
    jest.useRealTimers();
  });

  it('counts local calendar days across the spring daylight saving change', () => {
    const beforeMidnight = new Date(2026, 2, 8, 20);
    jest.useFakeTimers({ now: new Date(2026, 2, 9, 8) });
    const { getByText } = render(
      <InjectionSiteSelector {...callbacks()} doseHistory={[{
        ...dose('thigh_L', 0), timestamp: beforeMidnight.toISOString(),
      }]} selectedSite="thigh_L" />,
    );
    expect(getByText('Yesterday')).toBeTruthy();
    jest.useRealTimers();
  });
});
