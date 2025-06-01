# Testing Strategy

This document outlines the testing strategy for key components of the SafeDose application, particularly those recently added or modified.

## General Principles

*   **Unit Tests:** Focus on individual functions and components in isolation. Mock dependencies heavily.
*   **Integration Tests:** Test the interaction between a few components or modules (e.g., a screen and its context usage).
*   **End-to-End (E2E) Tests:** (Out of scope for this document but important for overall quality) Test full user flows through the application.
*   **Mocking:** Use Jest's mocking capabilities (`jest.mock`, `jest.fn()`) extensively for external dependencies, native modules, and context hooks.
*   **Testing Library:** Utilize `@testing-library/react-native` for component rendering and interaction to encourage testing based on user behavior.

## Component-Specific Testing Strategies

### 1. `app/onboarding/questionnaire.tsx`

*   **Objective:** Ensure the questionnaire renders correctly, user input is handled, validation works, and submission proceeds as expected.
*   **Test Types:** Component/Integration tests.
*   **Key Scenarios:**
    *   **Rendering:**
        *   Verify all three questions and their options are displayed.
        *   Verify the "Tell us about yourself" title is present.
        *   Verify the "Continue" button is present and initially disabled.
    *   **Input Handling & Validation:**
        *   Test selecting "Yes" for "Are you a licensed health professional?" updates state.
        *   Test selecting "No" for "Are you using this personally?" updates state.
        *   Test selecting "Cosmetic" for "Is this for cosmetic or prescribed use?" updates state.
        *   Verify the "Continue" button becomes enabled only after all three questions are answered.
        *   Verify the "Continue" button is disabled if any question is unanswered.
    *   **Submission & Navigation:**
        *   Mock `useAuth` from `contexts/AuthContext.tsx` to provide a mock `updateUserProfile` function.
        *   Mock `expo-router`'s `useRouter` to spy on navigation calls (`push`).
        *   When the "Continue" button is pressed (and enabled):
            *   Verify `updateUserProfile` is called with the correct profile data based on selections.
            *   Verify that after `updateUserProfile` resolves successfully, `router.push` is called to navigate to the next screen (e.g., `/onboarding/demo`).
            *   Verify behavior if `updateUserProfile` rejects (e.g., an error alert is shown).
    *   **Dependencies to Mock:**
        *   `expo-router` (`useRouter`)
        *   `@/contexts/AuthContext` (`useAuth`)
        *   `react-native/Libraries/Alert` (`Alert.alert`)

### 2. `contexts/AuthContext.tsx`

*   **Objective:** Ensure user profile data is correctly managed, saved to, and loaded from Firestore, and cleared on logout.
*   **Test Types:** Unit tests for context logic.
*   **Key Scenarios:**
    *   **`updateUserProfile` Function:**
        *   Mock Firestore functions (`doc`, `setDoc`, `getDoc`).
        *   Given a user is authenticated, call `updateUserProfile` with profile data.
        *   Verify `setDoc` is called with the correct Firestore path (`userProfiles/<user.uid>`) and data.
        *   Verify the local `userProfile` state in the context is updated.
        *   Test error handling if `setDoc` fails.
        *   Test behavior if no user is authenticated (should throw an error or handle gracefully).
    *   **Profile Loading (onAuthStateChanged):**
        *   Mock `onAuthStateChanged` and Firestore's `getDoc`.
        *   Simulate a user signing in.
        *   Case 1: Profile exists in Firestore. Verify `getDoc` is called, and `userProfile` state is set with fetched data.
        *   Case 2: Profile does NOT exist in Firestore. Verify `getDoc` is called, and `userProfile` state is set to `null`.
        *   Test error handling if `getDoc` fails.
    *   **Logout:**
        *   Verify `userProfile` state is cleared (set to `null`) when `logout` is called.
    *   **Dependencies to Mock:**
        *   `firebase/auth` (`onAuthStateChanged`, `signOut`, `signInAnonymously`)
        *   `firebase/firestore` (`doc`, `setDoc`, `getDoc`)
        *   `@/lib/firebase` (mock `auth` and `db` instances)
        *   `@/lib/analytics` (mock analytics functions)

### 3. `lib/doseUtils.ts` (`calculateDose` function)

*   **Objective:** Verify that `calculateDose` correctly adjusts warning messages in `calculationError` based on the provided `UserProfile`.
*   **Test Types:** Unit tests.
*   **Key Scenarios (focus on `userProfile` impact):**
    *   Provide basic valid inputs for `doseValue`, `concentration`, `unit`, `concentrationUnit`, `manualSyringe`.
    *   **Health Professional:**
        *   Pass a `UserProfile` with `isHealthProfessional: true`.
        *   If there's a minor precision warning, verify `calculationError` is prepended with `"[Professional Use] "`.
        *   If there's no other error, verify `calculationError` becomes `"[Professional Use] "`.
    *   **Personal Cosmetic Use:**
        *   Pass a `UserProfile` with `isPersonalUse: true`, `useType: 'Cosmetic'`.
        *   If there's a minor precision warning, verify `calculationError` includes `" Note: Cosmetic use may have different considerations."`.
        *   If there's no other error, verify `calculationError` becomes `"Note: Cosmetic use may have different considerations."`.
    *   **Combined Profile:**
        *   Pass a `UserProfile` with `isHealthProfessional: true`, `isPersonalUse: true`, `useType: 'Cosmetic'`.
        *   Verify `calculationError` includes both `"[Professional Use] "` and `"Note: Cosmetic use may have different considerations."`.
    *   **No Profile / Default:**
        *   Pass `userProfile: null` or omit it.
        *   Verify `calculationError` does not include profile-specific notes (e.g., only shows precision warning if applicable).
    *   **Existing Critical Errors:**
        *   Simulate a critical error (e.g., "Dose exceeds total available").
        *   Pass a `UserProfile` (e.g., health professional).
        *   Verify the profile-specific note is added to the existing critical error message (e.g., `"[Professional Use] Dose exceeds total available"`).
    *   **Dependencies to Mock:**
        *   None directly within `calculateDose` for these specific tests, but `UserProfile` interface is imported from `AuthContext`.

### 4. `app/(tabs)/new-dose.tsx` (Toast Logic)

*   **Objective:** Ensure that toasts are triggered with the correct parameters based on `UserProfile` and dose calculation outcomes.
*   **Test Types:** Component/Integration tests.
*   **Key Scenarios (focus on toast triggers):**
    *   Mock `useAuth` to provide various `UserProfile` states.
    *   Mock `useToast` to spy on the `toast` function calls.
    *   Mock `useDoseCalculator` to return different calculation results (`calculatedVolume`, `calculationError`, `manualStep`).
    *   **High Dosage Warning:**
        *   Set `userProfile` to non-health professional.
        *   Set `calculatedVolume` > 5 mL and `calculationError` to null or a non-critical one.
        *   Verify `toast` is called with `{ title: "Caution: High Dosage", ..., variant: "destructive" }`.
    *   **Cosmetic Use Reminder:**
        *   Set `userProfile` with `useType: 'Cosmetic'`.
        *   Simulate `manualStep` changing to `'finalResult'`.
        *   Verify `toast` is called with `{ title: "Cosmetic Use Reminder", ... }`.
        *   Verify it's only called once per "session" (e.g., by checking a mock state or interaction that would prevent subsequent calls).
    *   **Personal Use Advisory:**
        *   Set `userProfile` to personal use, non-health professional.
        *   Verify `toast` is called with `{ title: "Personal Use Advisory", ... }` on component mount/profile load.
        *   Verify it's only called once.
    *   **No Toast:**
        *   Set conditions where no toasts should appear (e.g., health professional with high dose, non-cosmetic use).
        *   Verify `toast` is not called.
    *   **Dependencies to Mock:**
        *   `@/contexts/AuthContext` (`useAuth`)
        *   `@/hooks/use-toast` (`useToast`)
        *   `../../lib/hooks/useDoseCalculator` (the whole hook)
        *   `expo-camera`, `openai`, etc., as needed if their setup affects rendering or initial state.
        *   `react-native/Libraries/Alert`

## Testing Environment Setup Notes

*   **Jest Configuration (`jest.config.js`):**
    *   Ensure `preset: "jest-expo"` or a similar React Native preset is used.
    *   Transformer for TypeScript: `ts-jest` or `babel-jest` with TypeScript support.
    *   `transformIgnorePatterns` should be configured to allow transpiling `expo-router` and other `expo-*` packages.
    *   `setupFilesAfterEnv`: Include a setup file for mocks, e.g., for `react-native-reanimated`, `jest-fetch-mock`.
    *   Native module mocks (e.g., `expo-constants`, `expo-status-bar`).
*   **`package.json` Dependencies:**
    *   `jest`, `@types/jest`
    *   `ts-jest` (or `babel-jest` with `@babel/preset-typescript`)
    *   `@testing-library/react-native`
    *   `@testing-library/jest-native` (for extended matchers)
    *   `jest-expo` (provides useful defaults and mocks)
*   **Global Mocks:** Consider a setup file (`jest.setup.js`) to mock global modules like `react-native-gesture-handler`, `react-native-reanimated`, AsyncStorage, etc.

This strategy provides a baseline. As the app evolves, new tests and potentially new types of tests (e.g., performance, accessibility) should be considered.
