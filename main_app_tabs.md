## Main Application Tab Structure

The main interface of the application utilizes a tab-based navigation system to provide users with easy access to core features. This structure is defined in `app/(tabs)/_layout.tsx`.

*   **Tab Navigator:** The primary navigation within the main application is handled by a Tab Navigator.
*   **Initial Route:** Upon entering the main application area, the default tab displayed to the user is the "Home" screen, which corresponds to the `new-dose` route.

### Tab Screens

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

### Styling and Behavior

*   **Header Management:** The main tab navigator is configured with `headerShown: false`. This indicates that the individual screens linked within each tab are responsible for managing their own header content (e.g., titles, back buttons if needed within a nested stack).
*   **Custom Tab Bar Styling:** Custom styling is applied to the tab bar itself to ensure it aligns with the application's overall design language. This might include active/inactive tab colors, icon styles, and background colors.
