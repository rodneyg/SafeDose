import React from 'react';
import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import ConfirmationModal from './ConfirmationModal';
import DatePickerSelect from './ui/DatePickerSelect';

jest.mock('react-native-picker-select', () => 'NativePicker');
jest.mock('lucide-react-native', () => ({ ChevronDown: 'ChevronDown' }));
jest.mock('../lib/utils', () => ({ isMobileWeb: false }));

it('exposes the selected year in the closed date picker button name', () => {
  Platform.OS = 'web';
  const screen = render(
    <DatePickerSelect
      label="Year"
      value="1990"
      onValueChange={jest.fn()}
      items={[{ label: '1990', value: '1990' }]}
    />,
  );

  expect(screen.getByRole('button', { name: 'Year, 1990' })).toBeTruthy();
});

it('exposes the confirmation title as the web dialog name', () => {
  Platform.OS = 'web';
  const screen = render(
    <ConfirmationModal
      visible
      title="Sign Out"
      message="Are you sure you want to sign out?"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    />,
  );

  expect(screen.UNSAFE_getByType(require('react-native').Modal).props.accessibilityLabel).toBe('Sign Out');
});
