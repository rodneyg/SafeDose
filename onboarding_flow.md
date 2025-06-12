## App Entry and Onboarding Flow

This document outlines the initial application entry logic and the user onboarding process.

### 1. Application Entry (`app/index.tsx`)

The initial entry point of the application is handled by `app/index.tsx`. Its primary responsibility is to determine the user's current state and route them accordingly.

*   **Storage Checks:** Upon launch, the application checks for two key pieces of information stored in `AsyncStorage`:
    *   `onboardingComplete`: A boolean flag (stored as a string 'true') indicating if the user has previously completed the main onboarding flow.
    *   `userProfile`: An object containing the user's profile information, gathered during a specific part of the onboarding.
*   **Loading State:** A loading indicator is displayed to the user while these checks are being performed in `AsyncStorage` to ensure a smooth user experience.
*   **Routing Logic:** Based on the values retrieved from `AsyncStorage`, the application follows this routing logic:
    *   If `onboardingComplete` is not equal to 'true', the user is navigated to the beginning of the onboarding flow: `/onboarding`.
    *   Else if `onboardingComplete` is 'true' but `userProfile` is `null` (or not found), the user is directed to a specific part of the onboarding process to gather their profile information: `/onboarding/userType`. This scenario might occur if the user completed an initial part of onboarding but not the profile creation.
    *   Else (if `onboardingComplete` is 'true' and `userProfile` exists), the user is considered fully onboarded and is navigated to the main application screen: `/(tabs)/new-dose`.

### 2. Onboarding Process

The onboarding process is a multi-step flow designed to welcome new users, introduce them to the app, and gather necessary information.

#### a. Onboarding Introduction (`app/onboarding/index.tsx`)

*   This is the first screen a new user (or a user who hasn't completed onboarding) sees when routed to `/onboarding`.
*   It typically displays a welcome message and includes a button or call to action to begin the onboarding sequence.

#### b. Onboarding Demo (`app/onboarding/demo.tsx`)

*   Following the initial welcome screen (`app/onboarding/index.tsx`), the user is navigated to the demo screen.
*   This screen showcases a demonstration of the app's core functionalities, giving users a preview of what the app can do. This aligns with the flow described in `docs/onboarding-flow.md` as "Welcome → Demo → ...".

#### c. Onboarding Features (`app/onboarding/features.tsx`)

*   While its exact position in the initial flow isn't explicitly detailed alongside `demo.tsx` in `docs/onboarding-flow.md`, the `onboarding/_layout.tsx` file defines `index`, `demo`, and `features` as distinct stack screens within the `/onboarding` route.
*   This suggests `features.tsx` is a separate step. It's likely presented after the `demo.tsx` screen to further highlight key app features before proceeding to core questions. It could elaborate on benefits or specific tools within the app.

#### d. Onboarding Core Questions (`app/onboarding/userType.tsx`)

This screen is responsible for gathering essential user information through a series of questions. This is also the screen users are directed to if `app/index.tsx` finds `onboardingComplete` as 'true' but `userProfile` is missing. The flow, as detailed in `docs/onboarding-flow.md`, is as follows:

*   **Progress Indication:** A progress indicator is displayed to show the user how far they are in the questioning process.
*   **Back Navigation:** Users have the ability to navigate back to previous questions or steps.
*   **Step 1: Background Information**
    *   Question: "What's your background?"
    *   Options:
        *   Healthcare Professional
        *   General User
*   **Step 2: Use Type Specification**
    *   Question: "What type of use?"
    *   Options:
        *   Medical/Prescribed
        *   Cosmetic/Aesthetic
*   **Step 3: Personal Use Context**
    *   Question: "Who is this for?"
    *   Options:
        *   For myself
        *   For someone else
    *   A "Skip" option is also available for this step.

### 3. Navigation to Main Application

*   **Completion and Data Storage:** Upon successful completion of all relevant onboarding steps (including the core questions in `app/onboarding/userType.tsx`), the application performs the following actions:
    *   The `onboardingComplete` flag is set to 'true' in `AsyncStorage`.
    *   The collected user profile data (from `app/onboarding/userType.tsx`) is saved to `AsyncStorage`.
*   **Routing to Main App:** After the data is saved, the user is navigated out of the onboarding flow and into the main part of the application. As per the logic in `app/index.tsx`, they are typically routed to `/(tabs)/new-dose`.
