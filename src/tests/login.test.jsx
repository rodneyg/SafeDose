import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { 
  signInWithEmailAndPassword,
  linkWithCredential,
  signInWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  getDoc, 
  setDoc, 
  updateDoc
} from 'firebase/firestore';
import LoginScreen from '../../app/login';
import { useAuth } from '../../contexts/AuthContext';

// Mock the AuthContext hook
jest.mock('../../contexts/AuthContext');

describe('LoginScreen', () => {
  // Set up common test variables
  const mockRouter = {
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn()
  };
  const mockPromptAsync = jest.fn();
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default router mock
    useRouter.mockReturnValue(mockRouter);
    
    // Default Google Auth mock
    useIdTokenAuthRequest.mockReturnValue([{}, null, mockPromptAsync]);
    
    // Default document response for Firestore
    getDoc.mockResolvedValue({
      exists: jest.fn().mockReturnValue(false),
      data: jest.fn()
    });
    
    // Default document update for Firestore
    setDoc.mockResolvedValue({});
    updateDoc.mockResolvedValue({});
  });
  
  describe('Email Sign-In Tests', () => {
    test('successful email sign-in for non-anonymous user should redirect to new-dose', async () => {
      // Mock a non-anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: false, uid: 'test-uid' },
        auth: {}
      });
      
      // Render the component
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      // Fill the form
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@safedose.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'Test1234');
      
      // Submit the form
      await act(async () => {
        fireEvent.press(getByText('Sign In with Email'));
      });
      
      // Assert sign-in was called with correct credentials
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'test@safedose.com', 'Test1234');
      
      // Assert redirect to new-dose
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
    });
    
    test('should link anonymous account with email credentials and update limit to 15', async () => {
      // Mock an anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: true, uid: 'anon-uid' },
        auth: {}
      });
      
      // Mock successful account linking
      linkWithCredential.mockResolvedValue({
        user: { uid: 'anon-uid' }
      });
      
      // Render the component
      const { getByPlaceholderText, getByText } = render(<LoginScreen />);
      
      // Fill the form
      fireEvent.changeText(getByPlaceholderText('Email'), 'test@safedose.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'Test1234');
      
      // Submit the form
      await act(async () => {
        fireEvent.press(getByText('Sign In with Email'));
      });
      
      // Assert linking was called with correct credentials
      expect(linkWithCredential).toHaveBeenCalledWith(
        { isAnonymous: true, uid: 'anon-uid' },
        'mock-email-credential'
      );
      
      // Verify Firestore update (limit: 15)
      expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        scansUsed: 0,
        plan: 'free'
      }));
      
      // Assert redirect to new-dose
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
    });
    
    test('should display an error message when email sign-in fails', async () => {
      // Mock a non-anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: false, uid: 'test-uid' },
        auth: {}
      });
      
      // Mock failed sign-in
      const mockError = new Error('Invalid credentials');
      signInWithEmailAndPassword.mockRejectedValue(mockError);
      
      // Render the component
      const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
      
      // Fill the form
      fireEvent.changeText(getByPlaceholderText('Email'), 'invalid@example.com');
      fireEvent.changeText(getByPlaceholderText('Password'), 'wrong');
      
      // Submit the form
      await act(async () => {
        fireEvent.press(getByText('Sign In with Email'));
      });
      
      // Assert error is displayed
      const errorMessage = await findByText('Invalid credentials');
      expect(errorMessage).toBeDefined();
    });
  });
  
  describe('Google Sign-In Tests', () => {
    test('successful Google sign-in for non-anonymous user should redirect to new-dose', async () => {
      // Mock a non-anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: false, uid: 'test-uid' },
        auth: {}
      });
      
      // Mock successful Google Auth response
      useIdTokenAuthRequest.mockReturnValue([
        {}, // request
        { type: 'success', params: { id_token: 'mock-token' } }, // response
        mockPromptAsync // promptAsync
      ]);
      
      // Render the component
      const { rerender } = render(<LoginScreen />);
      
      // Re-render to trigger useEffect
      rerender(<LoginScreen />);
      
      // Wait for async operations
      await waitFor(() => {
        expect(signInWithCredential).toHaveBeenCalledWith({}, 'mock-google-credential');
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
      });
    });
    
    test('should link anonymous account with Google credentials and update limit to 15', async () => {
      // Mock an anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: true, uid: 'anon-uid' },
        auth: {}
      });
      
      // Mock successful Google Auth response
      useIdTokenAuthRequest.mockReturnValue([
        {}, // request
        { type: 'success', params: { id_token: 'mock-token' } }, // response
        mockPromptAsync // promptAsync
      ]);
      
      // Mock successful account linking
      linkWithCredential.mockResolvedValue({
        user: { uid: 'anon-uid' }
      });
      
      // Render the component
      const { rerender } = render(<LoginScreen />);
      
      // Re-render to trigger useEffect
      rerender(<LoginScreen />);
      
      // Wait for async operations
      await waitFor(() => {
        expect(linkWithCredential).toHaveBeenCalledWith(
          { isAnonymous: true, uid: 'anon-uid' },
          'mock-google-credential'
        );
        
        // Verify Firestore update (limit: 15)
        expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
          scansUsed: 0,
          plan: 'free'
        }));
        
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new-dose');
      });
    });
    
    test('should handle Google sign-in cancellation without crashing', async () => {
      // Mock a non-anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: false, uid: 'test-uid' },
        auth: {}
      });
      
      // Mock canceled Google Auth response
      useIdTokenAuthRequest.mockReturnValue([
        {}, // request
        { type: 'cancel' }, // response
        mockPromptAsync // promptAsync
      ]);
      
      // Render the component
      const { getByText, queryByText, rerender } = render(<LoginScreen />);
      
      // Re-render to trigger useEffect
      rerender(<LoginScreen />);
      
      // Try to click the Google Sign-In button
      const googleButton = getByText('Sign In with Google');
      await act(async () => {
        fireEvent.press(googleButton);
      });
      
      // Verify that the prompt was called
      expect(mockPromptAsync).toHaveBeenCalled();
      
      // Make sure no error message is displayed
      expect(queryByText(/failed to sign in/i)).toBeNull();
      
      // Make sure we didn't navigate
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
    
    test('should display an error message when Google sign-in fails', async () => {
      // Mock a non-anonymous user
      useAuth.mockReturnValue({
        user: { isAnonymous: false, uid: 'test-uid' },
        auth: {}
      });
      
      // Mock successful Google Auth response but failed sign-in
      useIdTokenAuthRequest.mockReturnValue([
        {}, // request
        { type: 'success', params: { id_token: 'mock-token' } }, // response
        mockPromptAsync // promptAsync
      ]);
      
      // Mock sign-in failure
      const mockError = new Error('Google authentication failed');
      signInWithCredential.mockRejectedValue(mockError);
      
      // Render the component
      const { rerender, findByText } = render(<LoginScreen />);
      
      // Re-render to trigger useEffect
      rerender(<LoginScreen />);
      
      // Assert error is displayed
      const errorMessage = await findByText('Google authentication failed');
      expect(errorMessage).toBeDefined();
    });
  });
  
  describe('Cancel Navigation Tests', () => {
    test('clicking Cancel should navigate back', async () => {
      // Mock a user
      useAuth.mockReturnValue({
        user: { isAnonymous: false },
        auth: {}
      });
      
      // Render the component
      const { getByText } = render(<LoginScreen />);
      
      // Click the Cancel button
      await act(async () => {
        fireEvent.press(getByText('Cancel'));
      });
      
      // Verify navigation back
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });
});