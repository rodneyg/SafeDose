import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import LimitModal from './LimitModal';

jest.mock('expo-router', () => {
  const router = { push: jest.fn() };
  return { router, useRouter: () => router, Link: 'Link' };
});
jest.mock('../lib/analytics', () => ({ logAnalyticsEvent: jest.fn(), ANALYTICS_EVENTS: {} }));

const originalFetch = global.fetch;
const mockFetch = jest.fn();
const onClose = jest.fn();
const getEmailCaptureToken = jest.fn().mockResolvedValue('test-token');

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch;
  mockFetch.mockReset().mockResolvedValue({ ok: true, json: async () => ({ enabled: true }) });
});

afterEach(() => { global.fetch = originalFetch; });

it.each([true, false])('lets guests and Google users opt in only on explicit submit (%s)', async isAnonymous => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true }) })
    .mockResolvedValueOnce({ status: 204 });
  render(<LimitModal visible isAnonymous={isAnonymous} onClose={onClose} getEmailCaptureToken={getEmailCaptureToken} />);

  const input = await screen.findByLabelText('Email address');
  fireEvent.changeText(input, 'broken');
  fireEvent.press(screen.getByText('Save my email'));
  expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  expect(getEmailCaptureToken).not.toHaveBeenCalled();

  fireEvent.changeText(input, ' Person@EXAMPLE.test ');
  expect(mockFetch).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('Save my email'));
  expect(await screen.findByText('Thanks. We saved your email for SafeDose updates.')).toBeTruthy();
  expect(mockFetch).toHaveBeenLastCalledWith(expect.stringContaining('/api/upgrade-email'), expect.objectContaining({
    method: 'POST',
    headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Person@example.test' }),
  }));
  expect(onClose).not.toHaveBeenCalled();
});

it('allows upgrade without opting in', async () => {
  render(<LimitModal visible isAnonymous onClose={onClose} getEmailCaptureToken={getEmailCaptureToken} />);
  await screen.findByLabelText('Email address');
  fireEvent.press(screen.getByText('Upgrade'));
  expect(router.push).toHaveBeenCalledWith('/pricing');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(getEmailCaptureToken).not.toHaveBeenCalled();
});

it('allows retry after a storage failure', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ enabled: true }) })
    .mockResolvedValueOnce({ status: 503 }).mockResolvedValueOnce({ status: 204 });
  render(<LimitModal visible isAnonymous onClose={onClose} getEmailCaptureToken={getEmailCaptureToken} />);
  fireEvent.changeText(await screen.findByLabelText('Email address'), 'person@example.test');
  fireEvent.press(screen.getByText('Save my email'));
  expect(await screen.findByText('Could not save your email. Try again.')).toBeTruthy();
  fireEvent.press(screen.getByText('Save my email'));
  expect(await screen.findByText('Thanks. We saved your email for SafeDose updates.')).toBeTruthy();
});

it('keeps existing actions when capture is disabled', async () => {
  const json = jest.fn().mockResolvedValue({ enabled: false });
  mockFetch.mockResolvedValueOnce({ ok: true, json });
  render(<LimitModal visible isAnonymous onClose={onClose} getEmailCaptureToken={getEmailCaptureToken} />);
  await screen.findByText('Cancel');
  expect(json).toHaveBeenCalled();
  expect(screen.queryByLabelText('Email address')).toBeNull();
  fireEvent.press(screen.getByText('Cancel'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('does not offer capture on paid plans', () => {
  render(<LimitModal visible isAnonymous={false} isPremium onClose={onClose} getEmailCaptureToken={getEmailCaptureToken} />);
  expect(mockFetch).not.toHaveBeenCalled();
  expect(screen.queryByLabelText('Email address')).toBeNull();
});
