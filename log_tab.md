## "Log" Tab Flow

The "Log" tab serves as the user's historical record of medication doses calculated and recorded within the application.

*   **Tab Name:** Log
*   **Access:** Users can access this section by selecting the "Log" tab from the main application's bottom tab navigator. It is typically represented by a **History icon**.

### Purpose

The primary functions of the "Log" tab are:

*   **View Dose History:** To provide users with a comprehensive list of their previously recorded medication doses.
*   **Tracking and Review:** To enable users to track their medication usage patterns over time, review details of past calculations, and monitor adherence.
*   **Information Sharing:** To facilitate the sharing of accurate dosage history with healthcare providers, aiding in informed medical consultation and decision-making.

### Expected Content and Functionality

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
    *   If the application implements usage tiers or limits on the number of logs that can be stored or viewed (e.g., for a free plan), attempting to access or load logs beyond this limit could trigger the `LogLimitModal`. This modal would inform the user about the limitation and potentially suggest upgrading their plan.

The "Log" tab is a critical component for long-term user engagement, providing a valuable tool for personal medication management and historical review.
