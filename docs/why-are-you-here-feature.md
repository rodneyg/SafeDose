# What brought you here?

This optional question opens the [onboarding survey](pmf-survey-implementation.md)
when the user has no prior marker for it. Users can continue without answering.
They can select a referral source or a reason for using SafeDose, or select
**Other** and enter optional text.

`useOnboardingSurvey` stores the selected answer and optional text in
AsyncStorage. It also marks the question as shown and sends an analytics event
for a response or a skip. The response event includes the option and whether
custom text was present. Custom text stays in the local response record.

See [the survey component](../components/OnboardingSurvey.tsx) and
[the hook](../lib/hooks/useOnboardingSurvey.ts).
