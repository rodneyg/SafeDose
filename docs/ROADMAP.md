# SafeDose roadmap

First slice of [#370](https://github.com/rodneyg/SafeDose/issues/370). Use this page to track what to verify for release and link to the issues that own the work. Issue, PR, and release evidence checked November 21, 2026.

## Minimum Delightful Product

A new user can get from onboarding to a first calculation through manual entry or photo scan. They can review and correct inputs before using the result. A returning user can find a previous dose log and understand where it is stored. A user who reaches the scan limit can understand the upgrade choice and continue in manual mode.

| Journey | Current starting point | What to verify |
| --- | --- | --- |
| First visit to first result | The [onboarding flow](onboarding-flow.md) leads into the [New Dose screen](../app/(tabs)/new-dose.tsx). The [dose rules](dosing-rules.md) document the calculation boundaries. | Walk through guest and signed-in entry. Check manual completion, scan review, and a return to manual entry after a scan or permission error. |
| Return to dose history | The [log screen](../app/(tabs)/logs.tsx) and [privacy notice](../app/privacy.tsx) describe local history and signed-in sync. | Check that a saved entry is easy to find, that syncing is understandable, and that deletion works across local and synced records. |
| Scan limit to upgrade or manual entry | The [pricing screen](../app/pricing.tsx) and [photo-check payment notes](PHOTO_CHECK_STRIPE.md) cover the current flow. [#270](https://github.com/rodneyg/SafeDose/issues/270) tracks gating. Email opt-in code for [#274](https://github.com/rodneyg/SafeDose/issues/274) landed in [#474](https://github.com/rodneyg/SafeDose/pull/474). | Walk through the limit, checkout success and cancellation, and the free manual path. Verify the [private lead database setup](upgrade-email.md) before counting email capture as available. |

## Follow-on work

- Review protocol onboarding and scheduling together so optional setup leaves the one-off path available. [#391](https://github.com/rodneyg/SafeDose/issues/391) and [#368](https://github.com/rodneyg/SafeDose/issues/368) track the work. The initial changes landed in [#529](https://github.com/rodneyg/SafeDose/pull/529) and [#518](https://github.com/rodneyg/SafeDose/pull/518).
- Evaluate reusable presets against repeat-entry needs. [#331](https://github.com/rodneyg/SafeDose/issues/331) tracked the local presets shipped in [#520](https://github.com/rodneyg/SafeDose/pull/520).
- Use [#384](https://github.com/rodneyg/SafeDose/issues/384) for the detailed scan-data and guardrail review. For [#393](https://github.com/rodneyg/SafeDose/issues/393), document data, consent, and safety review criteria before evaluating release readiness.

## Privacy and security review

| Data flow | Review before wider release |
| --- | --- |
| Photos and scan evaluation | Compare the [scan API](../api/analyze-scan.js) and evaluation records with the [privacy notice](../app/privacy.tsx). The [README](../README.md#model-evaluation-and-scan-data) and privacy notice both describe sending photos for analysis. Verify what each service retains and what users see before sending a photo. |
| Profile, analytics, and dose logs | Check Firebase access by account and environment. Confirm what analytics records, exercise the deletion path, and identify where a separate consent step needs review before collecting additional data. See [authentication setup](auth-config.md) and [preview handling](preview-environment-implementation.md). |
| Checkout and optional follow-up email | Review checkout data and lead access separately. Check that declining email collection preserves the manual path and that withdrawal and removal can be carried out. See [upgrade email setup](upgrade-email.md). |

Record data flow, access, retention, and deletion findings in the review. Have the applicable privacy and compliance obligations assessed against those findings before making release claims.

## Release evidence

| Release check | Evidence on record | Still to verify |
| --- | --- | --- |
| Web deploy responds | [Root /ping](https://safedose.rodneygainous.com/ping), implemented in [#524](https://github.com/rodneyg/SafeDose/pull/524), returned HTTP 200 with `ok: true` and `service: safedose`. [/api/health](https://safedose.rodneygainous.com/api/health) returned `ok: true` for deploy `4e0d02d`. | Record the deploy commit and both responses for the release candidate. Use the [read-only smoke](../README.md#read-only-production-smoke) for public routes. |
| Web journeys | The [main CI run](https://github.com/rodneyg/SafeDose/actions/runs/44910734210) passed the web export at `25529a5`. | On a production-like build, exercise the three journeys above and record the browser, account mode, and result. Check sign-in on the [authorized hosts](auth-config.md) and use test mode for checkout success and cancellation. |
| iOS and Android startup | The Metro fix for [#240](https://github.com/rodneyg/SafeDose/issues/240) landed in [#481](https://github.com/rodneyg/SafeDose/pull/481). The same main CI run passed Expo exports for iOS and Android. | Use the [local development steps](../README.md#-local-development) to compile, install, and launch on iOS and Android. Record the commit, OS version, and first-result journey outcome for each platform. Capture the failing step and log if either build fails. |
| Store submission | The [release workflow](../.github/workflows/release.yml) creates a GitHub tag and release after successful main CI. | Record signed build IDs and submission status for each store, along with the outcome of the privacy and security review above. |

For each release candidate, replace these observations with dated evidence links. Track unresolved gaps under [#370](https://github.com/rodneyg/SafeDose/issues/370).
