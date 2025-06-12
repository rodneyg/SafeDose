## Login and Authentication Flow

The application employs a Firebase-based authentication system, primarily using Google Sign-In, and supports both authenticated and anonymous user states. The core logic for managing authentication state is encapsulated within the `AuthContext` (`contexts/AuthContext.tsx`), accessible via the `useAuth()` hook.

### Entry Points to the Login Screen (`app/login.tsx`)

Users can be directed to the login screen through several pathways:

1.  **`SignUpPrompt` Component (`components/SignUpPrompt.tsx`):**
    *   This modal component is strategically shown to anonymous users at various interaction points within the app. The visibility and timing of this prompt are managed by the `useSignUpPrompt` hook.
    *   The prompt typically encourages anonymous users to sign up or sign in for a better experience or to unlock features, containing a button that navigates them directly to `app/login.tsx`.

2.  **Settings Screen (`app/settings.tsx`):**
    *   If an anonymous user navigates to the "Settings" screen, it is expected to feature a "Login," "Sign In," or "Sign In / Sign Up" button that, when pressed, directs the user to `app/login.tsx`.

3.  **Action Requiring Authentication (Common Pattern):**
    *   Although not explicitly detailed for all cases, a common pattern is to redirect anonymous users to `app/login.tsx` if they attempt to access a feature or perform an action that strictly requires an authenticated account.

### Login Screen (`app/login.tsx`)

This screen handles the actual sign-in process.

*   **User Interface:**
    *   The screen is titled "Sign In" (or similar), clearly indicating its purpose.
*   **Primary Authentication Method: "Sign In with Google" Button:**
    *   This is the main call to action on the login screen.
    *   **Mechanism:** It utilizes Firebase Authentication's `signInWithPopup` method with the `GoogleAuthProvider`. This typically opens a Google sign-in popup or redirects to a Google authentication page.
    *   **Analytics Logging:** The sign-in attempt, success, or failure is logged for analytics:
        *   `ANALYTICS_EVENTS.SIGN_IN_ATTEMPT` (custom event, implied when the process starts)
        *   On success:
            *   `ANALYTICS_EVENTS.SIGN_IN_SUCCESS` if it's a returning user logging in.
            *   `ANALYTICS_EVENTS.SIGN_UP_SUCCESS` if an existing anonymous user successfully links their anonymous session with a newly authenticated Google account.
        *   On failure: `ANALYTICS_EVENTS.SIGN_IN_FAILURE`.
    *   **Account Linking for Anonymous Users:** If an anonymous user (identified by `user?.isAnonymous` from `useAuth`) uses "Sign In with Google," Firebase attempts to link their existing anonymous account (and any associated data, if designed to do so) with the new Google authenticated account.
*   **Error Handling:**
    *   Any errors encountered during the authentication process (e.g., network issues, user cancellation, provider error) are displayed on the screen to inform the user.
*   **Cancel Option:**
    *   A "Cancel" button is provided, which navigates the user back to the screen they were on before accessing the login page (e.g., back to the settings screen or closing the `SignUpPrompt`).

### Post-Login Navigation

*   Upon successful authentication (either a direct sign-in or linking an anonymous account), the user is automatically redirected to the main application interface, specifically to the "New Dose" tab: `/(tabs)/new-dose`.

### Authentication State Management (`contexts/AuthContext.tsx`)

*   The `AuthContext` is central to managing user authentication throughout the application.
*   The `useAuth()` hook, when consumed by components, provides access to:
    *   `user`: The Firebase user object, which contains information about the current user (e.g., `uid`, `displayName`, `email`, and `isAnonymous` status). If no user is signed in (or an anonymous session hasn't started), this will be `null`.
    *   `auth`: The Firebase auth instance itself, which can be used for more advanced authentication operations if needed.
*   Components across the app utilize `useAuth()` to dynamically adjust their behavior or appearance based on the user's authentication status (e.g., showing/hiding certain UI elements, enabling/disabling features).

### Anonymous Users

*   The application is designed to support anonymous users. When a user first opens the app and is not logged in, Firebase can create an anonymous user session (`user?.isAnonymous` would be true).
*   These anonymous users can access certain features of the app, but may encounter limitations:
    *   They might be periodically shown the `SignUpPrompt` to encourage them to create a persistent account.
    *   They might be subject to stricter usage limits (e.g., fewer free scans or log entries), potentially triggering modals like `LimitModal` more frequently.
*   The benefit of anonymous accounts is that user data can still be associated with this temporary user, and if they later choose to sign up with Google, this data can be seamlessly migrated to their permanent account through Firebase's account linking feature.
