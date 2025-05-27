# SafeDose Authentication Tests

This directory contains automated tests for the SafeDose login functionality, validating both email and Google Sign-In flows.

## Tests Overview

The tests cover the following scenarios:

### Email Sign-In Tests
- Successful email sign-in for non-anonymous users
- Anonymous account linking with email credentials
- Error handling for invalid credentials

### Google Sign-In Tests
- Successful Google sign-in for non-anonymous users
- Anonymous account linking with Google credentials
- Handling Google sign-in cancellation
- Error handling during Google sign-in

### Navigation Tests
- Verifying Cancel button navigation

## Running Tests

To run the tests, execute:

```bash
npm test
```

Or to run only the login tests:

```bash
npm test -- src/tests/login.test.jsx
```

## Implementation Details

1. **Firebase Authentication Mocking**:
   - Email sign-in and credential linking functions are mocked
   - Google auth providers and credential creation are mocked

2. **Firestore Integration**:
   - Tests verify that user documents are created with proper limits (15 scans for authenticated users)
   - Anonymous to authenticated user transition is validated

3. **Error Handling**:
   - Tests ensure error messages are properly displayed when authentication fails
   - Cancellation handling for Google authentication

4. **Navigation**:
   - Tests confirm proper navigation to the new-dose screen after successful authentication
   - Cancel button navigation is also tested

## Test Structure

The tests are organized using Jest's describe/test pattern:
- Top-level describe for the LoginScreen component
- Nested describes for each authentication method (Email, Google, Cancel)
- Individual test cases for specific scenarios

## Test Setup

The setup includes:
- Mocking Firebase Auth and Firestore functions
- Mocking Expo Router for navigation testing
- Mocking AsyncStorage for persistent data
- Mocking Google authentication response handling