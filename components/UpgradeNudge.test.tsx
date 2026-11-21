import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import UpgradeNudge from './UpgradeNudge';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

it('dismisses a scan nudge without navigation and remembers dismissal across mounts', async () => {
  const first = render(<UpgradeNudge userId="dismiss" kind="firstScan" />);
  fireEvent.press(await first.findByRole('button', { name: 'Not now' }));
  expect(first.queryByText(/Want unlimited photo checks/)).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
  first.unmount();

  const second = render(<UpgradeNudge userId="dismiss" kind="firstScan" />);
  await expect(second.findByRole('button', { name: 'Upgrade' }, { timeout: 100 })).rejects.toThrow();
});

it('sends the upgrade button to the existing pricing page and keeps logs free in the copy', async () => {
  const screen = render(<UpgradeNudge userId="upgrade" kind="firstLogs" />);
  expect(await screen.findByText(/Dose logs are free/)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Upgrade' }));
  expect(mockPush).toHaveBeenCalledWith('/pricing');
  expect(screen.queryByRole('button', { name: 'Upgrade' })).toBeNull();
});
