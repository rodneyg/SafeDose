const {
  FREE_SCAN_LIMIT,
  UNLIMITED_SCANS,
  getLimitForPlan,
  hasScanCapacity,
  isPaidPlan,
  mapPriceIdToPlan,
  isAllowedCheckoutPriceId,
  formatPlanDisplayName,
  PHOTO_CHECK_MONTHLY_LOOKUP,
} = require('./plans');

describe('plans', () => {
  it('caps unpaid and anonymous users at 3 scans per month', () => {
    expect(getLimitForPlan('free', true)).toBe(FREE_SCAN_LIMIT);
    expect(getLimitForPlan('photo_check', true)).toBe(FREE_SCAN_LIMIT);
    expect(getLimitForPlan('plus', true)).toBe(FREE_SCAN_LIMIT);
    expect(getLimitForPlan('free', false)).toBe(3);
    expect(getLimitForPlan(undefined, false)).toBe(3);
  });

  it('does not apply the unpaid cap to paid photo-scan or legacy paid plans', () => {
    expect(getLimitForPlan('photo_check', false)).toBe(UNLIMITED_SCANS);
    expect(getLimitForPlan('plus', false)).toBe(UNLIMITED_SCANS);
    expect(getLimitForPlan('pro', false)).toBe(UNLIMITED_SCANS);
    expect(getLimitForPlan('starter', false)).toBe(UNLIMITED_SCANS);
    expect(getLimitForPlan('basic_pro', false)).toBe(UNLIMITED_SCANS);
    expect(getLimitForPlan('full-pro', false)).toBe(UNLIMITED_SCANS);
    expect(isPaidPlan('photo_check')).toBe(true);
    expect(isPaidPlan('free')).toBe(false);
  });

  it('treats a negative or infinite limit as remaining capacity', () => {
    expect(hasScanCapacity(0, 3)).toBe(true);
    expect(hasScanCapacity(3, 3)).toBe(false);
    expect(hasScanCapacity(300, UNLIMITED_SCANS)).toBe(true);
    expect(hasScanCapacity(1, Infinity)).toBe(true);
  });

  it('maps live, env, lookup-key, and legacy prices onto paid plans', () => {
    expect(mapPriceIdToPlan('price_1RYgx7AY2p4W374YR9UxS0vr')).toBe('starter');
    expect(mapPriceIdToPlan('price_new_monthly', {
      STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID: 'price_new_monthly',
    })).toBe('photo_check');
    expect(mapPriceIdToPlan(undefined, {}, PHOTO_CHECK_MONTHLY_LOOKUP)).toBe('photo_check');
    expect(mapPriceIdToPlan('price_unknown')).toBe('free');
  });

  it('only allows known checkout price IDs', () => {
    expect(isAllowedCheckoutPriceId('price_1RUHgxAY2p4W374Yb5EWEtZ0')).toBe(true);
    expect(isAllowedCheckoutPriceId('price_injected', {})).toBe(false);
    expect(isAllowedCheckoutPriceId('price_env', {
      STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID: 'price_env',
    })).toBe(true);
  });

  it('formats plan names for settings and receipts', () => {
    expect(formatPlanDisplayName('photo_check')).toBe('Photo Scan');
    expect(formatPlanDisplayName('free')).toBe('Free');
    expect(formatPlanDisplayName('full-pro')).toBe('Full Pro');
  });
});
