import type { UseDoseCalculatorProps } from '../lib/hooks/useDoseCalculator';

const valid: UseDoseCalculatorProps = {
  checkUsageLimit: async (onVerifiedUsage) => {
    onVerifiedUsage?.({ scansUsed: 1, plan: 'free', limit: 3, lastReset: null });
    return true;
  },
  trackInteraction: () => {},
};
void valid;

// @ts-expect-error A usage check is required.
const missingCheck: UseDoseCalculatorProps = {};
// @ts-expect-error The check must return a Promise<boolean>.
const wrongResult: UseDoseCalculatorProps = { checkUsageLimit: () => true };
// @ts-expect-error The interaction callback takes no arguments.
const wrongTracker: UseDoseCalculatorProps = { checkUsageLimit: async () => true, trackInteraction: (value: string) => {} };
void [missingCheck, wrongResult, wrongTracker];
