import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import LogLimitModal from './LogLimitModal';

jest.mock('expo-router', () => {
  const router = { push: jest.fn() };
  return { router, useRouter: () => router };
});
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));

const onClose = jest.fn();
const onContinueWithoutSaving = jest.fn();

beforeEach(() => jest.clearAllMocks());

it('offers the existing Photo Scan plan and keeps a no-purchase path', () => {
  render(
    <LogLimitModal
      visible
      isAnonymous={false}
      onClose={onClose}
      onContinueWithoutSaving={onContinueWithoutSaving}
    />
  );

  expect(screen.getByText(/Photo Scan adds unlimited AI scans for \$2\.99\/month/)).toBeTruthy();
  fireEvent.press(screen.getByText('Continue without saving'));
  expect(onContinueWithoutSaving).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('routes the upgrade action to the existing pricing page', () => {
  render(
    <LogLimitModal
      visible
      isAnonymous={false}
      onClose={onClose}
      onContinueWithoutSaving={onContinueWithoutSaving}
    />
  );

  fireEvent.press(screen.getByText('View Photo Scan'));
  expect(router.push).toHaveBeenCalledWith('/pricing');
  expect(onClose).toHaveBeenCalledTimes(1);
});
