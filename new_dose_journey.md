## "New Dose" (Home Tab) User Journey

The "New Dose" tab, serving as the Home screen (`app/(tabs)/new-dose.tsx`), guides the user through a multi-step wizard to calculate and log medication doses. The flow is primarily controlled by a `screenStep` state variable, managed by the `useDoseCalculator` hook.

**Overall Structure:**

*   **Wizard-like Interface:** The process is broken down into sequential steps, ensuring a structured user experience.
*   **Header:** A consistent header displays the application title "SafeDose". The subtitle dynamically updates to reflect the current step in the dose calculation journey (e.g., "Scan Syringe", "Enter Dose", "Confirm Details").
*   **Recovery Mode:** A "Recover Previous Session" button becomes visible if the `doseCalculator.stateHealth` is detected as `'recovering'`, allowing users to resume an interrupted session.

---

### Screen Steps in the "New Dose" Flow:

The journey progresses through the following primary screen steps:

#### 1. Introduction (`IntroScreen` Component)

*   **Initial View:** This is the first screen presented when the user navigates to the "New Dose" tab.
*   **User Actions:**
    *   **Start Scan:** Initiates the image-based dose calculation process.
    *   **Start Manual Entry:** Allows the user to input dose parameters manually.
*   **Reset Option:** A `resetFullForm` function is available, likely to clear any previous inputs and start the flow afresh.

#### 2. Scan Syringe/Vial (`ScanScreen` Component)

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

#### 3. Manual Entry (`ManualEntryScreen` Component - Sub-Flow)

This screen step itself contains a sub-flow controlled by a `manualStep` state, guiding the user through different input fields.

*   **a. Dose Input:**
    *   User enters the desired dose amount and selects the unit (e.g., mg, mL, units).
*   **b. Medication Source Selection:**
    *   User chooses how the medication's strength is specified:
        *   'concentration' (e.g., mg/mL)
        *   'totalAmount' (e.g., total mg in a vial of a certain volume)
*   **c. Concentration Input:**
    *   Displayed if 'concentration' was selected as the source. User inputs the medication concentration.
*   **d. Total Amount Input:**
    *   Displayed if 'totalAmount' was selected as the source. User inputs the total amount of medication in the vial/container and its total volume.
*   **e. Reconstitution:**
    *   This step allows for calculations involving medications that need to be reconstituted (mixed with a diluent).
    *   It likely navigates the user to a dedicated reconstitution screen (`app/reconstitution.tsx`).
    *   Upon completing the reconstitution calculation, the user is returned to the `new-dose.tsx` flow, and relevant fields (e.g., `prefillTotalAmount` from `searchParams`) are prefilled with the reconstitution result.
*   **f. Syringe Selection:**
    *   User selects the type and total volume of the syringe they will be using. This is crucial for accurate final volume calculation and marking recommendations.
*   **g. Pre-Dose Confirmation:**
    *   A safety review step where the user can verify all entered and calculated parameters before finalizing.
*   **h. Final Result Display:**
    *   Shows the calculated volume to be drawn up.
    *   Provides a recommendation for the marking on the selected syringe that corresponds to this volume.
*   **Navigation & Options:**
    *   `handleBack`: Allows navigation to previous manual entry sub-steps or back to the Intro/Scan screen.
    *   `handleStartOver`: Resets the entire "New Dose" flow.
    *   `onTryAIScan`: If the user initiated manual entry, a teaser or button might be present to encourage them to try the AI Scan feature instead.
*   **Next Step from Final Result:** From the `finalResult` display, the user can typically proceed to the `postDoseFeedback` step.

#### 4. Why Are You Here (`WhyAreYouHereScreen` Component)

*   **Purpose:** This screen prompts the user to state their reason or intent for using the application at that particular time (e.g., routine dose, new medication, curiosity).
*   **Integration:** The display of this screen is integrated into the `doseCalculator`'s logic and appears at a predefined point in the overall dosing journey, not necessarily as a fixed step number in the `screenStep` sequence but rather when certain conditions in the calculator logic are met.

#### 5. Injection Site Selection (`InjectionSiteSelector` Component)

*   **Purpose:** Allows the user to select and log the anatomical site where the injection will be administered.
*   **Data Usage:** Loads past dose history (via `useDoseLogging`) to potentially show previous injection sites, aiding in site rotation.
*   **Integration:** Similar to the "Why Are You Here" screen, its appearance is governed by the `doseCalculator` logic.

#### 6. Post Dose Feedback (`PostDoseFeedbackScreen` Component)

*   **Trigger:** This screen is typically presented after a dose has been calculated and potentially logged (e.g., navigating from the `finalResult` display of the `ManualEntryScreen`).
*   **Functionality:**
    *   Allows the user to submit feedback about their experience with the dose calculation or the app itself.
    *   Users can select a feedback type and add textual notes.
    *   Feedback is submitted and stored using the `useFeedbackStorage` hook.
*   **Outcome:** Upon submitting feedback, `handleFeedbackComplete` is called, which likely resets parts of the "New Dose" flow or navigates the user to a neutral screen (e.g., back to the `IntroScreen` or the main `Log` tab).

---

### Key Modals within the "New Dose" Journey:

Several modals can appear during the "New Dose" flow to handle specific situations or provide information:

*   **`LimitModal`:** Displayed by `useUsageTracking` if the user exceeds free tier limits for features like AI scanning.
*   **`LogLimitModal`:** Displayed if there are limits on how many doses can be logged, also likely managed by `useUsageTracking` or `useDoseLogging`.
*   **`VolumeErrorModal`:** Appears if there are errors in calculation or user input related to volumes (e.g., dose volume exceeds syringe capacity).
*   **`ImagePreviewModal`:** (Described in Step 2: Scan Screen) Shows the captured image with options to retake or proceed.
*   **`SignUpPrompt`:** Managed by `useSignUpPrompt`, this modal appears at certain points to encourage anonymous users (identified via `useAuth`) to create an account.
*   **`PMFSurveyModal`:** A Product-Market Fit survey modal, likely shown periodically or after specific interactions to gather user sentiment.

---

### Supporting Hooks and Contexts:

The "New Dose" journey relies heavily on several custom hooks and potentially React Contexts to manage its complex state and logic:

*   **`useDoseCalculator`:** The core engine driving the multi-step process, managing `screenStep`, `manualStep`, calculation logic, and overall state of the dose form.
*   **`useUsageTracking`:** Monitors and enforces usage limits for various features (e.g., number of scans).
*   **`useFeedbackStorage`:** Handles the submission and storage of user feedback provided in the `PostDoseFeedbackScreen`.
*   **`useDoseLogging`:** Manages the saving and retrieval of dose logs, used in conjunction with steps like `InjectionSiteSelector` and potentially after final dose confirmation.
*   **`useSignUpPrompt`:** Controls the logic for when and how to prompt anonymous users to sign up.
*   **`useAuth`:** Provides information about the user's authentication status (e.g., logged in, anonymous), influencing features like the `SignUpPrompt`.
