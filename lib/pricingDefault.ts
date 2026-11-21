export type PricingDefault = 'monthly' | 'annual';

const STORAGE_KEY = 'safedose:pricing-default:v1';

export function assignPricingDefault(): PricingDefault | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'monthly' || stored === 'annual') return stored;

    const arm = Math.random() < 0.5 ? 'monthly' : 'annual';
    window.localStorage.setItem(STORAGE_KEY, arm);
    return arm;
  } catch {
    // Keep the monthly default if this browser cannot persist its assignment.
    return null;
  }
}

type PricingAction = 'view' | 'select_mo' | 'select_yr' | 'checkout_start';

// Use event names so GA4 reports can split the arms without custom dimensions.
export function pricingEvent(arm: PricingDefault, action: PricingAction) {
  return `pricing_v1_${arm}_${action}`;
}
