import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LimitModal from '../LimitModal';

// Mock analytics
jest.mock('../lib/analytics', () => ({
  logAnalyticsEvent: jest.fn(),
  ANALYTICS_EVENTS: {
    LIMIT_MODAL_VIEW: 'limit_modal_view',
    LIMIT_MODAL_ACTION: 'limit_modal_action',
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('LimitModal Freemium Updates', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display updated copy for scan limit reached', () => {
    const { getByText } = render(
      <LimitModal
        visible={true}
        isAnonymous={true}
        onClose={mockOnClose}
      />
    );

    // Check the new title and message
    expect(getByText("You've used your 3 free photo scans")).toBeTruthy();
    expect(getByText("SafeDose AI costs money to run. Upgrade to unlock unlimited scans and dose logs.")).toBeTruthy();
  });

  it('should display feedback input field', () => {
    const { getByText, getByPlaceholderText } = render(
      <LimitModal
        visible={true}
        isAnonymous={true}
        onClose={mockOnClose}
      />
    );

    // Check feedback section
    expect(getByText("What would make this worth paying for? (optional)")).toBeTruthy();
    expect(getByPlaceholderText("Your feedback...")).toBeTruthy();
  });

  it('should display new button options', () => {
    const { getByText } = render(
      <LimitModal
        visible={true}
        isAnonymous={true}
        onClose={mockOnClose}
      />
    );

    // Check new button text
    expect(getByText("Upgrade to Pro")).toBeTruthy();
    expect(getByText("Keep using manual mode (free)")).toBeTruthy();
  });

  it('should handle feedback input', () => {
    const { getByPlaceholderText } = render(
      <LimitModal
        visible={true}
        isAnonymous={true}
        onClose={mockOnClose}
      />
    );

    const feedbackInput = getByPlaceholderText("Your feedback...");
    
    // Type some feedback
    fireEvent.changeText(feedbackInput, 'Better UI would be great');
    
    // Verify the input accepts text
    expect(feedbackInput.props.value).toBe('Better UI would be great');
  });

  it('should handle keep manual mode action', () => {
    const { getByText } = render(
      <LimitModal
        visible={true}
        isAnonymous={true}
        onClose={mockOnClose}
      />
    );

    const keepManualButton = getByText("Keep using manual mode (free)");
    fireEvent.press(keepManualButton);

    // Should close the modal
    expect(mockOnClose).toHaveBeenCalled();
  });
});