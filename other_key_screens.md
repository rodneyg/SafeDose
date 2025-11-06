## Other Key Screens

This section details other notable screens within the application that play specific roles in the user journey but are not part of the main tab navigation or primary onboarding sequence.

### Success Screen (`app/success.tsx`) - DEPRECATED

*   **Status:** This screen has been removed as part of SafeDose's transition to a fully free and open-source model.
*   **Historical Context:** Previously used for subscription confirmation flows, which are no longer part of the application.

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
