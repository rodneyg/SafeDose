# Application User Experience (UX) Flow

This document outlines the comprehensive user experience flow of the application, covering initial onboarding to core functionalities and settings.

## Table of Contents

1.  [Initial App Entry and Onboarding Flow](#initial-app-entry-and-onboarding-flow)
2.  [Login and Authentication Flow](#login-and-authentication-flow)
3.  [Main Application Tab Structure](#main-application-tab-structure)
4.  ["New Dose" (Home Tab) User Journey](#new-dose-home-tab-user-journey)
5.  ["Log" Tab Flow](#log-tab-flow)
6.  ["Reference" Tab Flow](#reference-tab-flow)
7.  [Settings Flow](#settings-flow)
8.  [Pricing and Subscription Flow](#pricing-and-subscription-flow)
9.  [Other Key Screens](#other-key-screens)

---

## 1. Initial App Entry and Onboarding Flow

This section outlines the initial application entry logic and the user onboarding process.

### 1.1. Application Entry (`app/index.tsx`)

The initial entry point of the application is handled by `app/index.tsx`. Its primary responsibility is to determine the user's current state and route them accordingly.

*   **Storage Checks:** Upon launch, the application checks for two key pieces of information stored in `AsyncStorage`:
    *   `onboardingComplete`: A boolean flag (stored as a string 'true') indicating if the user has previously completed the main onboarding flow.
    *   `userProfile`: An object containing the user's profile information, gathered during a specific part of the onboarding.
*   **Loading State:** A loading indicator is displayed to the user while these checks are being performed in `AsyncStorage` to ensure a smooth user experience.
*   **Routing Logic:** Based on the values retrieved from `AsyncStorage`, the application follows this routing logic:
    *   If `onboardingComplete` is not equal to 'true', the user is navigated to the beginning of the onboarding flow: `/onboarding`.
    *   Else if `onboardingComplete` is 'true' but `userProfile` is `null` (or not found), the user is directed to a specific part of the onboarding process to gather their profile information: `/onboarding/userType`. This scenario might occur if the user completed an initial part of onboarding but not the profile creation.
    *   Else (if `onboardingComplete` is 'true' and `userProfile` exists), the user is considered fully onboarded and is navigated to the main application screen: `/(tabs)/new-dose`.

### 1.2. Onboarding Process

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

### 1.3. Navigation to Main Application

*   **Completion and Data Storage:** Upon successful completion of all relevant onboarding steps (including the core questions in `app/onboarding/userType.tsx`), the application performs the following actions:
    *   The `onboardingComplete` flag is set to 'true' in `AsyncStorage`.
    *   The collected user profile data (from `app/onboarding/userType.tsx`) is saved to `AsyncStorage`.
*   **Routing to Main App:** After the data is saved, the user is navigated out of the onboarding flow and into the main part of the application. As per the logic in `app/index.tsx`, they are typically routed to `/(tabs)/new-dose`.

---

## 2. Login and Authentication Flow

The application employs a Firebase-based authentication system, primarily using Google Sign-In, and supports both authenticated and anonymous user states. The core logic for managing authentication state is encapsulated within the `AuthContext` (`contexts/AuthContext.tsx`), accessible via the `useAuth()` hook.

### 2.1. Entry Points to the Login Screen (`app/login.tsx`)

Users can be directed to the login screen through several pathways:

1.  **`SignUpPrompt` Component (`components/SignUpPrompt.tsx`):**
    *   This modal component is strategically shown to anonymous users at various interaction points within the app. The visibility and timing of this prompt are managed by the `useSignUpPrompt` hook.
    *   The prompt typically encourages anonymous users to sign up or sign in for a better experience or to unlock features, containing a button that navigates them directly to `app/login.tsx`.

2.  **Settings Screen (`app/settings.tsx`):**
    *   If an anonymous user navigates to the "Settings" screen, it is expected to feature a "Login," "Sign In," or "Sign In / Sign Up" button that, when pressed, directs the user to `app/login.tsx`.

3.  **Action Requiring Authentication (Common Pattern):**
    *   Although not explicitly detailed for all cases, a common pattern is to redirect anonymous users to `app/login.tsx` if they attempt to access a feature or perform an action that strictly requires an authenticated account.

### 2.2. Login Screen (`app/login.tsx`)

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

### 2.3. Post-Login Navigation

*   Upon successful authentication (either a direct sign-in or linking an anonymous account), the user is automatically redirected to the main application interface, specifically to the "New Dose" tab: `/(tabs)/new-dose`.

### 2.4. Authentication State Management (`contexts/AuthContext.tsx`)

*   The `AuthContext` is central to managing user authentication throughout the application.
*   The `useAuth()` hook, when consumed by components, provides access to:
    *   `user`: The Firebase user object, which contains information about the current user (e.g., `uid`, `displayName`, `email`, and `isAnonymous` status). If no user is signed in (or an anonymous session hasn't started), this will be `null`.
    *   `auth`: The Firebase auth instance itself, which can be used for more advanced authentication operations if needed.
*   Components across the app utilize `useAuth()` to dynamically adjust their behavior or appearance based on the user's authentication status (e.g., showing/hiding certain UI elements, enabling/disabling features).

### 2.5. Anonymous Users

*   The application is designed to support anonymous users. When a user first opens the app and is not logged in, Firebase can create an anonymous user session (`user?.isAnonymous` would be true).
*   These anonymous users can access certain features of the app, but may encounter limitations:
    *   They might be periodically shown the `SignUpPrompt` to encourage them to create a persistent account.
    *   They might be subject to stricter usage limits (e.g., fewer free scans or log entries), potentially triggering modals like `LimitModal` more frequently.
*   The benefit of anonymous accounts is that user data can still be associated with this temporary user, and if they later choose to sign up with Google, this data can be seamlessly migrated to their permanent account through Firebase's account linking feature.

---

## 3. Main Application Tab Structure

The main interface of the application utilizes a tab-based navigation system to provide users with easy access to core features. This structure is defined in `app/(tabs)/_layout.tsx`.

*   **Tab Navigator:** The primary navigation within the main application is handled by a Tab Navigator.
*   **Initial Route:** Upon entering the main application area, the default tab displayed to the user is the "Home" screen, which corresponds to the `new-dose` route.

### 3.1. Tab Screens

The following tabs are available in the main application interface:

1.  **Home (`new-dose.tsx`)**
    *   **Icon:** Camera icon (e.g., `camera-outline` or a similar variant)
    *   **Route Name:** `new-dose`
    *   **Purpose:** This is the central screen of the application where users can initiate a new dose calculation. It likely offers options for scanning (implied by the camera icon) or performing manual data entry for the calculation.

2.  **Reference (`reference.tsx`)**
    *   **Icon:** BookOpen icon (e.g., `book-open-outline` or a similar variant)
    *   **Route Name:** `reference`
    *   **Purpose:** This tab provides users with access to reference materials. This could include guides, information sheets, protocols, or other relevant documentation to assist them in using the app or understanding dosage information.

3.  **Log (`logs.tsx`)**
    *   **Icon:** History icon (e.g., `history` or a similar variant)
    *   **Route Name:** `logs`
    *   **Purpose:** This tab allows users to view a history of their past dose calculations or entries. It serves as a logbook for tracking and reviewing previous activity within the app.

### 3.2. Styling and Behavior

*   **Header Management:** The main tab navigator is configured with `headerShown: false`. This indicates that the individual screens linked within each tab are responsible for managing their own header content (e.g., titles, back buttons if needed within a nested stack).
*   **Custom Tab Bar Styling:** Custom styling is applied to the tab bar itself to ensure it aligns with the application's overall design language. This might include active/inactive tab colors, icon styles, and background colors.

---

## 4. "New Dose" (Home Tab) User Journey

The "New Dose" tab, serving as the Home screen (`app/(tabs)/new-dose.tsx`), guides the user through a multi-step wizard to calculate and log medication doses. The flow is primarily controlled by a `screenStep` state variable, managed by the `useDoseCalculator` hook.

### 4.1. Overall Structure

*   **Wizard-like Interface:** The process is broken down into sequential steps, ensuring a structured user experience.
*   **Header:** A consistent header displays the application title "SafeDose". The subtitle dynamically updates to reflect the current step in the dose calculation journey (e.g., "Scan Syringe", "Enter Dose", "Confirm Details").
*   **Recovery Mode:** A "Recover Previous Session" button becomes visible if the `doseCalculator.stateHealth` is detected as `'recovering'`, allowing users to resume an interrupted session.

### 4.2. Screen Steps in the "New Dose" Flow

The journey progresses through the following primary screen steps:

#### a. Introduction (`IntroScreen` Component)

*   **Initial View:** This is the first screen presented when the user navigates to the "New Dose" tab.
*   **User Actions:**
    *   **Start Scan:** Initiates the image-based dose calculation process.
    *   **Start Manual Entry:** Allows the user to input dose parameters manually.
*   **Reset Option:** A `resetFullForm` function is available, likely to clear any previous inputs and start the flow afresh.

#### b. Scan Syringe/Vial (`ScanScreen` Component)

*   **Camera Activation:** This step utilizes the device camera (via `expo-camera`) for the user to capture an image of a syringe or vial.
*   **Permissions Handling:**
    *   `useCameraPermissions` hook is employed to request and manage camera access.
    *   Specific handling for web camera permissions is also implemented.
*   **AI-Powered Image Processing:**
    *   The captured image is sent to an OpenAI service for analysis (`captureAndProcessImage` function).
    *   This AI processing aims to automatically extract relevant information (e.g., medication concentration, volume) from the image.
*   **User Interface Elements:**
    *   `isProcessing`: Loading indicators are shown while the image is being uploaded and processed.
    *   `scanError`: Error messages are displayed if the scan fails or an issue occurs.
    *   Flashlight Toggle: A control to toggle the camera flashlight is available (primarily for web).
*   **Image Preview (`ImagePreviewModal`):**
    *   After an image is captured, it's displayed in this modal.
    *   Users can choose to:
        *   **Retake:** Discard the current image and capture a new one.
        *   **Continue:** Proceed with the captured image for AI processing.
*   **Outcome & Navigation:**
    *   Upon successful processing by the AI (or selection of a fallback/manual adjustment option after a scan attempt), the extracted scan results are applied to the dose calculator form (`applyScanResults`).
    *   The user is then transitioned to the `manualEntry` screen step, specifically to the "dose" input sub-step, with data from the scan pre-filling relevant fields.
*   **Limit Handling (`LimitModal`):**
    *   If the user exceeds predefined limits for scanning (e.g., daily scan quota), the `LimitModal` is displayed, managed by the `useUsageTracking` hook.
*   **UI Behavior:** The main tab bar is hidden during this scanning step to provide a more focused, full-screen camera experience.

#### c. Manual Entry (`ManualEntryScreen` Component - Sub-Flow)

This screen step itself contains a sub-flow controlled by a `manualStep` state, guiding the user through different input fields.

*   **c.1. Dose Input:**
    *   User enters the desired dose amount and selects the unit (e.g., mg, mL, units).
*   **c.2. Medication Source Selection:**
    *   User chooses how the medication's strength is specified:
        *   'concentration' (e.g., mg/mL)
        *   'totalAmount' (e.g., total mg in a vial of a certain volume)
*   **c.3. Concentration Input:**
    *   Displayed if 'concentration' was selected as the source. User inputs the medication concentration.
*   **c.4. Total Amount Input:**
    *   Displayed if 'totalAmount' was selected as the source. User inputs the total amount of medication in the vial/container and its total volume.
*   **c.5. Reconstitution:**
    *   This step allows for calculations involving medications that need to be reconstituted (mixed with a diluent).
    *   It likely navigates the user to a dedicated reconstitution screen (`app/reconstitution.tsx`). (See section 9.2 for details)
    *   Upon completing the reconstitution calculation, the user is returned to the `new-dose.tsx` flow, and relevant fields (e.g., `prefillTotalAmount` from `searchParams`) are prefilled with the reconstitution result.
*   **c.6. Syringe Selection:**
    *   User selects the type and total volume of the syringe they will be using. This is crucial for accurate final volume calculation and marking recommendations.
*   **c.7. Pre-Dose Confirmation:**
    *   A safety review step where the user can verify all entered and calculated parameters before finalizing.
*   **c.8. Final Result Display:**
    *   Shows the calculated volume to be drawn up.
    *   Provides a recommendation for the marking on the selected syringe that corresponds to this volume.
*   **Navigation & Options:**
    *   `handleBack`: Allows navigation to previous manual entry sub-steps or back to the Intro/Scan screen.
    *   `handleStartOver`: Resets the entire "New Dose" flow.
    *   `onTryAIScan`: If the user initiated manual entry, a teaser or button might be present to encourage them to try the AI Scan feature instead.
*   **Next Step from Final Result:** From the `finalResult` display, the user can typically proceed to the `postDoseFeedback` step.

#### d. Why Are You Here (`WhyAreYouHereScreen` Component)

*   **Purpose:** This screen prompts the user to state their reason or intent for using the application at that particular time (e.g., routine dose, new medication, curiosity).
*   **Integration:** The display of this screen is integrated into the `doseCalculator`'s logic and appears at a predefined point in the overall dosing journey, not necessarily as a fixed step number in the `screenStep` sequence but rather when certain conditions in the calculator logic are met.

#### e. Injection Site Selection (`InjectionSiteSelector` Component)

*   **Purpose:** Allows the user to select and log the anatomical site where the injection will be administered.
*   **Data Usage:** Loads past dose history (via `useDoseLogging`) to potentially show previous injection sites, aiding in site rotation.
*   **Integration:** Similar to the "Why Are You Here" screen, its appearance is governed by the `doseCalculator` logic.

#### f. Post Dose Feedback (`PostDoseFeedbackScreen` Component)

*   **Trigger:** This screen is typically presented after a dose has been calculated and potentially logged (e.g., navigating from the `finalResult` display of the `ManualEntryScreen`).
*   **Functionality:**
    *   Allows the user to submit feedback about their experience with the dose calculation or the app itself.
    *   Users can select a feedback type and add textual notes.
    *   Feedback is submitted and stored using the `useFeedbackStorage` hook.
*   **Outcome:** Upon submitting feedback, `handleFeedbackComplete` is called, which likely resets parts of the "New Dose" flow or navigates the user to a neutral screen (e.g., back to the `IntroScreen` or the main `Log` tab).

### 4.3. Key Modals within the "New Dose" Journey

Several modals can appear during the "New Dose" flow to handle specific situations or provide information:

*   **`LimitModal`:** Displayed by `useUsageTracking` if the user exceeds free tier limits for features like AI scanning. (Links to Pricing Flow - Section 8)
*   **`LogLimitModal`:** Displayed if there are limits on how many doses can be logged, also likely managed by `useUsageTracking` or `useDoseLogging`. (Links to Pricing Flow - Section 8)
*   **`VolumeErrorModal`:** Appears if there are errors in calculation or user input related to volumes (e.g., dose volume exceeds syringe capacity).
*   **`ImagePreviewModal`:** (Described in Step 4.2.b) Shows the captured image with options to retake or proceed.
*   **`SignUpPrompt`:** Managed by `useSignUpPrompt`, this modal appears at certain points to encourage anonymous users (identified via `useAuth`) to create an account. (Links to Login Flow - Section 2)
*   **`PMFSurveyModal`:** A Product-Market Fit survey modal, likely shown periodically or after specific interactions to gather user sentiment.

### 4.4. Supporting Hooks and Contexts

The "New Dose" journey relies heavily on several custom hooks and potentially React Contexts to manage its complex state and logic:

*   **`useDoseCalculator`:** The core engine driving the multi-step process, managing `screenStep`, `manualStep`, calculation logic, and overall state of the dose form.
*   **`useUsageTracking`:** Monitors and enforces usage limits for various features.
*   **`useFeedbackStorage`:** Handles the submission and storage of user feedback.
*   **`useDoseLogging`:** Manages the saving and retrieval of dose logs.
*   **`useSignUpPrompt`:** Controls the logic for when and how to prompt anonymous users to sign up.
*   **`useAuth`:** Provides information about the user's authentication status.

---

## 5. "Log" Tab Flow

The "Log" tab serves as the user's historical record of medication doses calculated and recorded within the application.

*   **Tab Name:** Log
*   **Access:** Users can access this section by selecting the "Log" tab from the main application's bottom tab navigator. It is typically represented by a **History icon**.

### 5.1. Purpose

The primary functions of the "Log" tab are:

*   **View Dose History:** To provide users with a comprehensive list of their previously recorded medication doses.
*   **Tracking and Review:** To enable users to track their medication usage patterns over time, review details of past calculations, and monitor adherence.
*   **Information Sharing:** To facilitate the sharing of accurate dosage history with healthcare providers, aiding in informed medical consultation and decision-making.

### 5.2. Expected Content and Functionality

The "Log" tab retrieves and displays dose history, primarily utilizing the `useDoseLogging` hook (specifically the `getDoseLogHistory` function or similar).

**Core Features:**

*   **List of Logged Doses:**
    *   The main view will display a list of past dose entries.
    *   Entries are typically presented in reverse chronological order (most recent first) for ease of access to recent activity.
*   **Key Information per Log Entry:** Each item in the list is expected to summarize key details of a logged dose, which might include:
    *   Date and time the dose was recorded.
    *   Name or identifier of the substance/medication.
    *   The actual dosage administered (e.g., in mg, mcg, units).
    *   The calculated volume that was drawn up (e.g., in mL).
    *   The selected injection site (if this feature was used and data logged).
    *   Any additional notes the user might have added during or after the dose logging.
*   **Data Source:** The displayed log data is fetched from storage using functionalities provided by the `useDoseLogging` hook.

**Potential Additional Functionalities:**

*   **Detailed View:** Tapping on a specific log entry would likely navigate the user to a more detailed view, showing all recorded information for that particular dose.
*   **Editing/Deletion (with considerations):**
    *   The ability to edit or delete log entries might be provided.
    *   However, such actions could be restricted, require confirmation, or include warnings about the implications of altering medical records, even if self-managed.
*   **Filtering and Searching:**
    *   Users might be able to filter the log list based on criteria like date ranges, medication type, or other parameters.
    *   A search functionality could allow users to find specific log entries.
*   **Exporting Logs:**
    *   An option to export the dose log (e.g., as a PDF or CSV file) could be available, useful for sharing with healthcare professionals or for personal record-keeping outside the app.
*   **Limit Handling (`LogLimitModal`):**
    *   If the application implements usage tiers or limits on the number of logs that can be stored or viewed (e.g., for a free plan), attempting to access or load logs beyond this limit could trigger the `LogLimitModal`. This modal would inform the user about the limitation and potentially suggest upgrading their plan (links to Pricing Flow - Section 8).

The "Log" tab is a critical component for long-term user engagement, providing a valuable tool for personal medication management and historical review.

---

## 6. "Reference" Tab Flow

The "Reference" tab provides users with access to informational and educational content within the application.

*   **Tab Name:** Reference
*   **Access:** Users can navigate to this section by selecting the "Reference" tab from the main application's bottom tab navigator. It is typically represented by a **BookOpen icon**.

### 6.1. Purpose and Content

The primary purpose of the "Reference" tab is to offer users a repository of helpful information, guidelines, and educational materials pertinent to medication dosage, application usage, safety protocols, and other related topics. This feature aims to empower users with knowledge and support their understanding of best practices.

**Expected Content and Functionality:**

While the specific content can vary, the "Reference" tab is generally expected to include:

*   **Information Display:**
    *   A primary view, likely scrollable, listing various reference articles, topics, or documents.
    *   Content could range from concise FAQs and quick guides to more detailed articles or protocols.
*   **Content Nature:**
    *   The information presented is typically static (embedded within the app) or dynamically fetched from a Content Management System (CMS) or a dedicated backend service. This allows for updates and additions without requiring an app update.
*   **Potential Features:**
    *   **Categorization:** Content might be organized into logical categories or sections (e.g., "Medication Information," "Device Guides," "Safety Procedures," "FAQs") to improve navigation and browsability.
    *   **Search Functionality:** A search bar could be included, allowing users to quickly find specific information by typing keywords.
    *   **Links to External Resources:** Where appropriate, the tab might contain links to reputable external websites, such as medical bodies, drug information databases, or regulatory agencies, for further reading.
    *   **Glossary:** A glossary of terms relevant to medication dosage and the app's functionality could be provided.
    *   **Instructional Materials:** This could include how-to guides for using specific app features or understanding complex calculation aspects.
*   **User Interface:**
    *   Each reference item would likely be selectable, leading to a detail view where the full content of the article or topic is displayed.
    *   The design would prioritize readability and ease of access to information.

In essence, the "Reference" tab acts as an in-app library or knowledge base, supporting the user's journey by providing readily accessible and relevant information.

---

## 7. Settings Flow

The "Settings" screen provides users with access to manage their account, subscription, application preferences, and find support information.

*   **Screen Name:** Settings
*   **Access:**
    *   While the exact entry point is not explicitly detailed in the provided file information, settings screens are conventionally accessed via:
        *   A **gear icon** (⚙️) or a "Settings" text link.
        *   This button is often located in a main navigation menu, a user profile screen, or sometimes directly on a tab bar if space and design permit. For this app, it might be accessible from a user profile area linked from one of the main tabs or a modal.
    *   The screen is located at `app/settings.tsx`.

### 7.1. Current Explicit Functionality (from `app/settings.tsx`)

*   **"Cancel Subscription" Button:**
    *   A button labeled "Cancel Subscription" is present on this screen.
    *   **Action:** When pressed, it currently logs an analytics event: `ANALYTICS_EVENTS.CANCEL_SUBSCRIPTION`.
    *   **Implementation Status:** A comment (`// TODO: Add real cancellation or downgrade logic`) within `app/settings.tsx` indicates that the actual backend logic for subscription cancellation or downgrading user plans is not yet fully implemented. (Links to Pricing Flow - Section 8)

### 7.2. Implied and Potential Functionality

Based on common application patterns and the existing "Cancel Subscription" feature, the "Settings" screen is likely intended to host or link to the following functionalities:

*   **User Account Management:**
    *   **Authentication State:** The options displayed would likely differ based on whether the user is logged in or using the app anonymously.
    *   **Login / Sign Up:** If the user is anonymous or logged out, a prominent "Login" or "Sign In / Sign Up" button would be available, navigating them to the `app/login.tsx` screen. (Links to Login Flow - Section 2)
    *   **Logout:** For authenticated users, a "Logout" button would allow them to sign out of their account.
    *   **Profile Details:** Options to view or edit user profile information. This might include:
        *   Email address or other account identifiers.
        *   Preferences initially set during onboarding (e.g., user background like "Healthcare Professional" vs. "General User", primary use type like "Medical" vs. "Cosmetic").
        *   Password change functionality.

*   **Subscription Management:**
    *   **View Current Plan:** Display information about the user's current subscription tier.
    *   **Upgrade/Change Plan:** Links or buttons leading to `app/pricing.tsx`. (Links to Pricing Flow - Section 8)
    *   The "Cancel Subscription" button would be part of this section.

*   **Application Preferences:**
    *   **Notifications:** Settings to enable or disable push notifications.
    *   **Appearance:** Light/dark mode toggle.
    *   **Data & Privacy:** Options related to data usage, personalization.

*   **Information & Support:**
    *   **About:** App version, terms of service, privacy policy.
    *   **Help / Support:** FAQs, contact support.

The "Settings" screen acts as a central hub for users to control their experience with the application, manage their account, and access important informational resources.

---

## 8. Pricing and Subscription Flow

The application incorporates a subscription model, offering different tiers of access and features.

### 8.1. Indicators of a Subscription Model

*   **Usage Limit Modals (`LimitModal`, `LogLimitModal`):** Check for `usageData.plan !== 'free'` or `isPremium`.
*   **Settings Screen (`app/settings.tsx`):** Includes a "Cancel Subscription" button.
*   **Dedicated Pricing Screen (`app/pricing.tsx`):** For viewing and choosing plans.
*   **Backend Payment Processing (Stripe):** Suggested by `STRIPE_SETUP.md` and `api/stripe-webhook.js`.

### 8.2. Entry Points to the Pricing Screen (`app/pricing.tsx`)

1.  **From Usage Limit Modals (`LimitModal`, `LogLimitModal`):** An "Upgrade" or "View Plans" button navigates to `app/pricing.tsx`.
2.  **From the Settings Screen (`app/settings.tsx`):** "Manage Subscription," "View Plans," or "Upgrade Account" options navigate to `app/pricing.tsx`.
3.  **Promotional Elements:** Banners or messages elsewhere in the app.

### 8.3. Pricing Screen (`app/pricing.tsx`) - Assumed Content & Functionality

*   **Purpose:** Display subscription plans, features, and prices.
*   **Content:**
    *   Comparison of tiers (e.g., Free vs. Premium).
    *   Features per plan (scans, logs, premium features).
    *   Pricing details (monthly/annual costs).
    *   Buttons to select a plan and proceed to payment.
*   **Payment Integration (Stripe):**
    *   Integrates with Stripe for payment processing.
    *   Users enter payment details securely.

### 8.4. Post-Subscription Actions

1.  **Account Update:** User's plan status (`userProfile.plan`, `isPremium`) is updated.
2.  **Feature Unlocking:** Access to features is adjusted based on the new plan.
3.  **Navigation/Confirmation:** User may be navigated to a success screen (e.g., `app/success.tsx` - see Section 9.1) or back to the initiating screen. Email confirmation is sent.

### 8.5. Subscription Cancellation

*   **Entry Point:** "Cancel Subscription" button in `app/settings.tsx`.
*   **Process (partially implemented):**
    *   Currently logs an analytics event.
    *   Full implementation (TODO in `app/settings.tsx`) would involve backend interaction with Stripe to stop future billing and manage plan changes at the end of the billing cycle.

This flow ensures users can understand plan benefits, make informed purchase decisions, and manage their subscription status.

---

## 9. Other Key Screens

This section details other notable screens that play specific roles in the user journey.

### 9.1. Success Screen (`app/success.tsx`)

*   **Screen Name:** Success
*   **File Path:** `app/success.tsx`

**Purpose:**
To provide clear and positive visual confirmation to the user after successfully completing a significant action, such as a subscription purchase.

**Potential Triggers / Entry Points:**
*   After a successful subscription purchase via `app/pricing.tsx`.
*   *Note:* Not used for post-login success (which redirects to `/(tabs)/new-dose`).

**Expected Content and Functionality:**
*   **Clear Success Message:** E.g., "Payment Successful!", "Subscription Activated!".
*   **Visual Cue:** Success icon (e.g., checkmark).
*   **Confirmation Details (Optional):** E.g., "Your Premium Plan is now active."
*   **Navigation Button:** E.g., "Continue to App," leading to the main app area.
*   **Automatic Redirect (Optional):** May redirect after a few seconds.

### 9.2. Reconstitution Screen (`app/reconstitution.tsx`)

*   **Screen Name:** Reconstitution
*   **File Path:** `app/reconstitution.tsx`

**Role and Context:**
A specialized component within the "New Dose" manual entry sub-flow (Section 4.2.c.5).

*   **Access:** Navigated to when a user needs to calculate dosage for medication requiring reconstitution.
*   **Functionality:** Provides an interface for reconstitution calculations (inputs for diluent volume, powder volume/amount, desired concentration).
*   **Output/Return:** Passes results (e.g., final concentration, total volume) back to the `new-dose.tsx` screen via navigation parameters (e.g., `searchParams.prefillTotalAmount`).

This screen handles complex reconstitution calculations separately, simplifying the main dose entry form.

---
