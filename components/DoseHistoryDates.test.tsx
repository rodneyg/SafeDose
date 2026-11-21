import React from 'react';
import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import LogsScreen from '../app/(tabs)/logs';
import { useDoseLogging } from '../lib/hooks/useDoseLogging';

jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../lib/hooks/useUsageTracking', () => ({ useUsageTracking: () => ({}) }));
jest.mock('../lib/hooks/useWebOffline', () => ({ useWebOffline: () => false }));
jest.mock('../lib/hooks/useDoseLogging', () => ({ useDoseLogging: jest.fn() }));
jest.mock('lucide-react-native', () => ({ Trash2: 'Trash2', Calendar: 'Calendar', Pill: 'Pill' }));
jest.mock('../components/UpgradeNudge', () => () => null);

describe('dose history dates', () => {
  let screen: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => screen?.unmount());
    jest.useRealTimers();
  });

  async function renderedText(now: Date, timestamp: string) {
    jest.useFakeTimers().setSystemTime(now);
    jest.mocked(useDoseLogging).mockReturnValue({
      getDoseLogHistory: jest.fn().mockResolvedValue([{
        id: 'dose-1',
        substanceName: 'Test medication',
        doseValue: 1,
        unit: 'mg',
        calculatedVolume: 1,
        timestamp,
      }]),
      deleteDoseLog: jest.fn(),
      logDose: jest.fn(),
      syncLogsToFirestore: jest.fn(),
      isLogging: false,
      logUsageData: { logsUsed: 0, plan: 'free', limit: 10, lastReset: null },
    });

    await act(async () => {
      screen = create(<LogsScreen />);
    });

    return screen!.root.findAllByType(Text).map(({ props }) =>
      React.Children.toArray(props.children).join(''),
    );
  }

  const timeOptions = { hour: '2-digit', minute: '2-digit' } as const;

  it('shows the elapsed minutes for a dose on the same local day', async () => {
    const dose = new Date(2026, 0, 16, 0, 5);
    const text = await renderedText(new Date(2026, 0, 16, 0, 10), dose.toISOString());

    expect(text).toContain(`5m ago at ${dose.toLocaleTimeString([], timeOptions)}`);
  });

  it('labels a dose just before local midnight as yesterday', async () => {
    const dose = new Date(2026, 0, 15, 23, 55);
    const text = await renderedText(new Date(2026, 0, 16, 0, 10), dose.toISOString());

    expect(text).toContain(`Yesterday at ${dose.toLocaleTimeString([], timeOptions)}`);
  });

  it.each(['2026-01-16T04:55:00.000Z', '2026-01-15T23:55:00.000-05:00'])(
    'shows the device-local date and time for the ISO timestamp %s',
    async (timestamp) => {
      const dose = new Date(Date.UTC(2026, 0, 16, 4, 55));
      const text = await renderedText(new Date(2026, 0, 26, 12), timestamp);

      expect(text).toContain(`${dose.toLocaleDateString()} at ${dose.toLocaleTimeString([], timeOptions)}`);
    },
  );

  it.each(['not-a-date', ''])('shows one fallback for an invalid timestamp (%j)', async (timestamp) => {
    const text = await renderedText(new Date(2026, 0, 16, 0, 10), timestamp);

    expect(text).toContain('Date unavailable');
    expect(text.join(' ')).not.toContain('Invalid Date');
  });
});
