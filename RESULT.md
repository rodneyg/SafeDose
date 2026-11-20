STATUS: SUCCESS

Documented every exported hook under `lib/hooks/`, excluding the root `hooks/` work assigned to #380, #382, and #386. Added a focused regression test. Commit: `1f72d97`. Pull request metadata was prepared, but the available PR tool did not return a URL.

## ATTEMPTS

- GitHub fetch was blocked by the environment proxy with HTTP 403.
- GitHub CLI issue lookup was unavailable because no authentication was configured.
- Continued from the checked-out main snapshot and recorded details in `ATTEMPTS.md`.

## Evidence paths

- `lib/hooks/hook-docs.test.ts`
- `lib/hooks/useBeforeFirstScanPrompt.ts`
- `lib/hooks/useDoseCalculator.ts`
- `lib/hooks/useDoseLogging.ts`
- `lib/hooks/useEvaluationDataCapture.ts`
- `lib/hooks/useFeedbackStorage.ts`
- `lib/hooks/useLogUsageTracking.ts`
- `lib/hooks/useOnboardingIntentStorage.ts`
- `lib/hooks/useOnboardingSurvey.ts`
- `lib/hooks/usePowerUserPromotion.ts`
- `lib/hooks/useReconstitutionPlanner.ts`
- `lib/hooks/useSignUpPrompt.ts`
- `lib/hooks/useUsageTracking.ts`
- `lib/hooks/useWebOffline.ts`
- `fix.tsv`
- `pending-board-update.tsv`

## How we verified

1. `npx jest lib/hooks/hook-docs.test.ts --runInBand` passed.
2. `npx tsc --noEmit --pretty false` passed.
3. `git diff --check` passed before commit.
