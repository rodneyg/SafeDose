## Other Key Screens

This section details other notable screens within the application that play specific roles in the user journey but are not part of the main tab navigation or primary onboarding sequence.

### Success Screen (`app/success.tsx`)

*   **Screen Name:** Success
*   **File Path:** `app/success.tsx`

**Purpose:**
The primary purpose of the `app/success.tsx` screen is to provide clear and positive visual confirmation to the user immediately after they have successfully completed a significant action or transaction within the app. This enhances user experience by acknowledging their achievement and providing a sense of completion.

**Potential Triggers / Entry Points:**
While the screen can be used for various success scenarios, a key anticipated trigger is:

*   **After Successful Subscription Purchase:** Following a successful payment and subscription activation initiated from `app/pricing.tsx`, the user would likely be redirected to this screen to confirm their new plan is active.
*   **Other Major Actions:** Although less common for this specific application's current scope, it could theoretically be used after other significant, multi-step processes if they existed (e.g., a complex initial setup different from the current onboarding).
    *   *Note:* It is not used for post-login success, as `app/login.tsx` directly navigates to `/(tabs)/new-dose`.

**Expected Content and Functionality:**
The `app/success.tsx` screen is expected to feature:

*   **Clear Success Message:** A prominent message conveying success, such as "Payment Successful!", "Subscription Activated!", "You're All Set!", or similar.
*   **Visual Cue:** An icon (e.g., a checkmark) or a relevant graphic that visually reinforces the successful outcome.
*   **Confirmation Details (Optional):** Depending on the context, it might briefly reiterate what was achieved (e.g., "Your Premium Plan is now active.").
*   **Navigation Button:** A primary call-to-action button to navigate the user away from the success screen. This button might be labeled "Continue to App," "Go to Dashboard," "Start Using Premium Features," or similar, and would typically lead to the main application area (e.g., `/(tabs)/new-dose`) or a relevant feature page.
*   **Automatic Redirect (Optional):** The screen might be configured to automatically redirect the user to another screen after a short delay (e.g., 3-5 seconds) if no action is taken on the button.

### Reconstitution Screen (`app/reconstitution.tsx`)

*   **Screen Name:** Reconstitution
*   **File Path:** `app/reconstitution.tsx`

**Role and Context:**
The `app/reconstitution.tsx` screen is a specialized component within the "New Dose" manual entry sub-flow (`app/(tabs)/new-dose.tsx`).

*   **Access:** It is navigated to when a user is manually entering dose information and indicates that the medication requires reconstitution (i.e., mixing a powdered drug with a diluent to achieve a specific concentration).
*   **Functionality:** This screen provides a dedicated interface for reconstitution calculations. It likely includes input fields for:
    *   The amount of medication in the vial (e.g., in mg, mcg, or units).
    *   The volume of diluent to be added.
    *   The powder volume displacement (if applicable).
    *   The desired final concentration (or this might be calculated).
*   **Output/Return:** After the user inputs the necessary values and the calculation is performed, the screen passes the results—such as the final concentration, total volume of the reconstituted solution, or total amount of active ingredient in the final solution—back to the `new-dose.tsx` screen. This is achieved using navigation parameters (as indicated by the use of `searchParams.prefillTotalAmount` in the `new-dose.tsx` context, suggesting that `reconstitution.tsx` sends back data that can prefill fields in the main dose calculation form).

This screen ensures that complex reconstitution calculations are handled accurately and separately, simplifying the main dose entry form in `new-dose.tsx`.
