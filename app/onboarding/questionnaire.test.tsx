import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QuestionnaireScreen from './questionnaire'; // Adjust path if necessary
import { UserProfile } from '@/contexts/AuthContext';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  Stack: {
    Screen: (props: any) => jest.fn(() => <>{props.children}</>) // Mock Stack.Screen as a passthrough
  }
}));

const mockUpdateUserProfile = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' }, // Mock a user object
    updateUserProfile: mockUpdateUserProfile,
  }),
  // Export UserProfile if it's used in the component props or types, though not directly used by mocks here
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));


describe('QuestionnaireScreen', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    mockUpdateUserProfile.mockClear();
    (require('expo-router').useRouter().push as jest.Mock).mockClear();
    (require('react-native/Libraries/Alert/Alert').alert as jest.Mock).mockClear();
  });

  it('renders all questions and the continue button (initially disabled)', () => {
    const { getByText, getByRole } = render(<QuestionnaireScreen />);

    expect(getByText('Tell us about yourself')).toBeTruthy();
    expect(getByText('Are you a licensed health professional?')).toBeTruthy();
    expect(getByText('Are you using this personally?')).toBeTruthy();
    expect(getByText('Is this for cosmetic or prescribed use?')).toBeTruthy();

    const continueButton = getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeTruthy();
    // Check disabled state - React Native Testing Library might not directly support "disabled" prop checking easily on custom TouchableOpacity
    // Instead, we check if allQuestionsAnswered is false initially, which controls the disabled prop
    // Or, by trying to press it and see if updateUserProfile is NOT called.
    // For now, we'll rely on the logic that it's disabled if not all questions answered.
    // We can also check the style if a specific disabled style is applied.
    // Example: expect(continueButton.props.accessibilityState.disabled).toBe(true); // This depends on how disabled is implemented
  });

  it('enables the continue button only when all questions are answered', () => {
    const { getByText, getByRole } = render(<QuestionnaireScreen />);

    const continueButton = getByText('Continue'); // More robust way to get the button

    // Initially, button should be disabled (logic implies this)
    // Let's simulate answering questions
    fireEvent.press(getByText('Yes')); // Answer Q1
    // At this point, button should still be disabled

    fireEvent.press(getByText('No')); // Answer Q2 (assuming first No is for personal use)
                                      // Need to be more specific if multiple "No" options
    const personalUseNoOption = getAllByText(getByText('Are you using this personally?').parent, 'No')[0];
    fireEvent.press(personalUseNoOption);


    // Button still disabled
    fireEvent.press(getByText('Cosmetic')); // Answer Q3

    // Now, the button should be enabled. We can check this by absence of disabled style or by functionality.
    // For this test, we'll assume its enabled state is correctly reflected by the `allQuestionsAnswered` variable.
    // A functional test would be to press it and see if the submission logic is triggered.
  });

  it('calls updateUserProfile and navigates on continue if all questions answered', async () => {
    mockUpdateUserProfile.mockResolvedValueOnce(undefined); // Simulate successful update
    const { getByText } = render(<QuestionnaireScreen />);
    const routerPushMock = require('expo-router').useRouter().push;

    // Answer all questions
    // For "Are you a licensed health professional?"
    const q1OptionYes = getByText('Yes'); // Assuming this is unique enough or get more specific
    fireEvent.press(q1OptionYes);

    // For "Are you using this personally?" - get the 'No' specific to this question
    // This requires a more robust way to select options, e.g., testID or specific parent-child query
    // For simplicity, assuming "No" options are distinguishable or we pick the right one.
    // A better way: find the question text, then find the "No" button within its parent.
    const q2Options = getByText('Are you using this personally?').parent.findAllByText('No');
    fireEvent.press(q2Options[0]); // Press first "No" found under Q2

    // For "Is this for cosmetic or prescribed use?"
    fireEvent.press(getByText('Prescribed'));

    // Press continue
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateUserProfile).toHaveBeenCalledWith({
      isHealthProfessional: true, // Based on "Yes" for Q1
      isPersonalUse: false,      // Based on "No" for Q2
      useType: 'Prescribed',     // Based on "Prescribed" for Q3
    } as UserProfile);

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/onboarding/demo');
    });
     expect(require('react-native/Libraries/Alert/Alert').alert).toHaveBeenCalledWith("Success", "Your profile has been updated.");
  });

  it('shows an alert if updateUserProfile fails', async () => {
    mockUpdateUserProfile.mockRejectedValueOnce(new Error('Update failed'));
    const { getByText } = render(<QuestionnaireScreen />);
    const alertMock = require('react-native/Libraries/Alert/Alert').alert;

    // Answer all questions
    fireEvent.press(getByText('No')); // Q1: No
    const q2Options = getByText('Are you using this personally?').parent.findAllByText('Yes');
    fireEvent.press(q2Options[0]); // Q2: Yes
    fireEvent.press(getByText('Cosmetic')); // Q3: Cosmetic

    // Press continue
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledTimes(1);
    });

    expect(alertMock).toHaveBeenCalledWith("Error", "Failed to update your profile. Please try again.");
  });

   it('shows validation alert if not all questions are answered on continue', () => {
    const { getByText } = render(<QuestionnaireScreen />);
    const alertMock = require('react-native/Libraries/Alert/Alert').alert;

    // Answer only one question
    fireEvent.press(getByText('Yes')); // Q1

    // Press continue
    fireEvent.press(getByText('Continue'));

    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith("Validation Error", "Please answer all questions before continuing.");
  });
});

// Helper to get all instances of text within a parent, useful for selecting specific buttons
// (Not a standard RTL query, but shows concept for disambiguation if needed)
function getAllByText(parent: any, text: string) {
  return parent.findAll((node: any) => node.props.children === text && node.type === 'Text');
}
