import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import ConfirmationModal from './ConfirmationModal';
import LimitModal from './LimitModal';
import LogLimitModal from './LogLimitModal';
import PostDoseFeedbackScreen from './PostDoseFeedbackScreen';

const mockLogAnalyticsEvent = jest.fn();

jest.mock('../lib/analytics', () => ({
  ANALYTICS_EVENTS: {
    FEEDBACK_SKIPPED: 'feedback_skipped',
    FEEDBACK_SUBMITTED: 'feedback_submitted',
    LIMIT_MODAL_ACTION: 'limit_modal_action',
    LIMIT_MODAL_VIEW: 'limit_modal_view',
  },
  logAnalyticsEvent: (...args: unknown[]) => mockLogAnalyticsEvent(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

it('renders ConfirmationModal and invokes both actions', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const screen = render(
    <ConfirmationModal
      visible
      message="This action cannot be undone."
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );

  expect(screen.getByText('This action cannot be undone.')).toBeTruthy();
  fireEvent.press(screen.getByText('Confirm'));
  fireEvent.press(screen.getByText('Cancel'));

  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('renders LimitModal and routes an anonymous user to sign in', () => {
  const onClose = jest.fn();
  const screen = render(<LimitModal visible isAnonymous onClose={onClose} />);

  expect(screen.getByText('Free Scan Limit Reached')).toBeTruthy();
  fireEvent.press(screen.getByText('Sign In'));

  expect(router.push).toHaveBeenCalledWith('/login');
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockLogAnalyticsEvent).toHaveBeenCalledWith('limit_modal_action', { action: 'sign_in' });
});

it('renders LogLimitModal and continues without saving', () => {
  const onClose = jest.fn();
  const onContinueWithoutSaving = jest.fn();
  const screen = render(
    <LogLimitModal
      visible
      isAnonymous={false}
      onClose={onClose}
      onContinueWithoutSaving={onContinueWithoutSaving}
    />,
  );

  expect(screen.getByText('Dose History Storage Limit Reached')).toBeTruthy();
  fireEvent.press(screen.getByText('Continue without saving'));

  expect(onContinueWithoutSaving).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(mockLogAnalyticsEvent).toHaveBeenCalledWith('limit_modal_action', {
    action: 'continue_without_saving',
    type: 'log_limit',
  });
});

it('renders PostDoseFeedbackScreen and submits trimmed optional notes', () => {
  const onSubmit = jest.fn();
  const screen = render(
    <PostDoseFeedbackScreen
      context={{
        nextAction: 'new_dose',
        doseInfo: {
          substanceName: 'Medication',
          doseValue: 1,
          unit: 'mg',
          calculatedVolume: 0.1,
        },
      }}
      isMobileWeb={false}
      onSkip={jest.fn()}
      onSubmit={onSubmit}
    />,
  );

  expect(screen.getByText('How did this dose feel?')).toBeTruthy();
  fireEvent.press(screen.getByText('Something felt wrong'));
  fireEvent.changeText(screen.getByPlaceholderText('Brief description of what felt wrong...'), '  Dizzy  ');
  fireEvent.press(screen.getByText('Submit & continue to new dose'));

  expect(onSubmit).toHaveBeenCalledWith('something_wrong', 'Dizzy');
  expect(mockLogAnalyticsEvent).toHaveBeenCalledWith('feedback_submitted', {
    feedbackType: 'something_wrong',
  });
});
