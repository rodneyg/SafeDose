# Onboarding survey

SafeDose can show one optional survey after a second successfully saved dose.
The flow can follow manual entry or a scan. It honors the existing per-user
survey marker in AsyncStorage, including earlier skips. The survey is offered
once per storage identity and closes if that identity changes.

The first question asks what brought the user to SafeDose when the prior
question marker is absent. See [the optional question](why-are-you-here-feature.md).
The remaining four questions ask how the user would feel without SafeDose, who
might benefit from it, its main benefit, and how it could improve. Users can
skip the survey. The UI submits the four answers together after completion.

`useOnboardingSurvey` manages eligibility, local markers, analytics, and writes
completed responses to `pmf_survey_responses` in Firestore. A completed response
includes the session count, flow type, completion time, and a Firebase user ID
when available. The app emits separate analytics events for showing, dismissing,
skipping, and completing the survey.

See [the survey component](../components/OnboardingSurvey.tsx),
[the hook](../lib/hooks/useOnboardingSurvey.ts), and
[the hook tests](../lib/hooks/useOnboardingSurvey.test.tsx).
