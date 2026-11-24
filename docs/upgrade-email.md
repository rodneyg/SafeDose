# Upgrade email capture

The scan-limit prompt offers email updates after a free user runs out of scans.
The pricing page also offers the form when a Firebase user session is available.
The user submits an address explicitly. SafeDose stores a server timestamp,
whether the Firebase session is a guest or Google session, and the signup source.
The API uses a hash of the Firebase UID as the document key to make retries safe.
It stores no raw UID, scan inputs, photos, or free-text survey responses. It
does not send email. A repeat submission of the same address keeps the existing
record. To remove consent, find the lead by its submitted email in the private
database and remove it through the existing privacy request process.

## Enable capture

1. In the Firebase project used for app authentication, use a dedicated named
   Cloud Firestore database for `leads`. Apply deny-all rules to that database
   and verify that guest and signed-in app clients cannot read or write it.
   The server SDK uses IAM. Restrict access to the lead database to the
   server identity and people who handle privacy requests.
2. Configure these server-side Vercel variables once the private database is
   ready. Use separate auth and storage configuration for any preview where
   capture is enabled.
   - `UPGRADE_EMAIL_FIREBASE_PROJECT_ID`
   - `UPGRADE_EMAIL_FIREBASE_CLIENT_EMAIL`
   - `UPGRADE_EMAIL_FIREBASE_PRIVATE_KEY`
   - `UPGRADE_EMAIL_DATABASE_ID`
3. Redeploy and check that `GET /api/upgrade-email` returns `{"enabled":true}`.
   This confirms configuration presence. Verify an authenticated synthetic
   opt-in against a separate test database and confirm the timestamp and
   denial of direct client access before using the production form.

When configuration is absent, the scan-limit prompt keeps its existing actions
and both entry points hide the email form.

[Firebase Admin setup](https://firebase.google.com/docs/admin/setup) and
[Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started)
