/**
 * Canonical SafeDose plans for the free calculator + $2.99 web photo-check offer.
 * The calculator, reconstitution, and on-device logs stay free.
 * Unpaid gpt-4o photo scans are capped at FREE_SCAN_LIMIT per calendar month.
 * Paid photo-check (and legacy paid plans) are not limited by that cap.
 */
const FREE_SCAN_LIMIT = 3;
const UNLIMITED_SCANS = -1;

const PHOTO_CHECK_MONTHLY_CENTS = 299;
const PHOTO_CHECK_ANNUAL_CENTS = 2699;
const PHOTO_CHECK_MONTHLY_AMOUNT = 2.99;
const PHOTO_CHECK_ANNUAL_AMOUNT = 26.99;
const PHOTO_CHECK_ANNUAL_SAVINGS_PERCENT = 25;

const PHOTO_CHECK_MONTHLY_LOOKUP = 'safedose_photo_check_monthly';
const PHOTO_CHECK_ANNUAL_LOOKUP = 'safedose_photo_check_annual';
const PHOTO_CHECK_PRODUCT_NAME = 'SafeDose Photo Check';

const PAID_PLAN_IDS = new Set([
  'photo_check',
  'photo-check',
  'plus',
  'pro',
  'starter',
  'basic_pro',
  'basic-pro',
  'full_pro',
  'full-pro',
]);

const LEGACY_PRICE_TO_PLAN = {
  price_1RYgx7AY2p4W374YR9UxS0vr: 'starter',
  price_1RYgx7AY2p4W374Yy23EtyIm: 'starter',
  price_1RYgyPAY2p4W374YNbpBpbqv: 'basic-pro',
  price_1RYgyPAY2p4W374YJOhwDafY: 'basic-pro',
  price_1RUHgxAY2p4W374Yb5EWEtZ0: 'full-pro',
  price_1RYgzUAY2p4W374YHiBBHvuX: 'full-pro',
};

const FALLBACK_TEST_PRICE_ID = 'price_1REyzMPE5x6FmwJPyJVJIEXe';

const PHOTO_CHECK_OFFERS = {
  photo_check_monthly: {
    offerKey: 'photo_check_monthly',
    lookupKey: PHOTO_CHECK_MONTHLY_LOOKUP,
    envVar: 'STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID',
    unitAmount: PHOTO_CHECK_MONTHLY_CENTS,
    interval: 'month',
    nickname: 'Photo Check Monthly',
  },
  photo_check_annual: {
    offerKey: 'photo_check_annual',
    lookupKey: PHOTO_CHECK_ANNUAL_LOOKUP,
    envVar: 'STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID',
    unitAmount: PHOTO_CHECK_ANNUAL_CENTS,
    interval: 'year',
    nickname: 'Photo Check Annual',
  },
};

function isPaidPlan(plan) {
  return PAID_PLAN_IDS.has(plan);
}

function getLimitForPlan(plan, isAnonymous) {
  if (isAnonymous) return FREE_SCAN_LIMIT;
  if (isPaidPlan(plan)) return UNLIMITED_SCANS;
  return FREE_SCAN_LIMIT;
}

function hasScanCapacity(scansUsed, limit) {
  const used = Number(scansUsed) || 0;
  if (limit === Infinity || limit < 0) return true;
  return used < limit;
}

function mapPriceIdToPlan(priceId, env, lookupKey) {
  if (lookupKey === PHOTO_CHECK_MONTHLY_LOOKUP || lookupKey === PHOTO_CHECK_ANNUAL_LOOKUP) {
    return 'photo_check';
  }
  if (!priceId) return 'free';
  const vars = env || (typeof process !== 'undefined' ? process.env : {}) || {};
  if (
    priceId === vars.STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID ||
    priceId === vars.STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID
  ) {
    return 'photo_check';
  }
  if (LEGACY_PRICE_TO_PLAN[priceId]) return LEGACY_PRICE_TO_PLAN[priceId];
  if (priceId === vars.STRIPE_LIVE_PRICE_ID || priceId === vars.STRIPE_TEST_PRICE_ID || priceId === FALLBACK_TEST_PRICE_ID) {
    return 'photo_check';
  }
  return 'free';
}

function isAllowedCheckoutPriceId(priceId, env) {
  if (!priceId) return false;
  const vars = env || (typeof process !== 'undefined' ? process.env : {}) || {};
  if (LEGACY_PRICE_TO_PLAN[priceId]) return true;
  if (priceId === FALLBACK_TEST_PRICE_ID) return true;
  const allowedEnv = [
    vars.STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID,
    vars.STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID,
    vars.STRIPE_TEST_PRICE_ID,
    vars.STRIPE_LIVE_PRICE_ID,
  ].filter(Boolean);
  return allowedEnv.includes(priceId);
}

function formatPlanDisplayName(plan) {
  switch (plan) {
    case 'photo_check':
    case 'photo-check':
      return 'Photo Check';
    case 'basic-pro':
    case 'basic_pro':
      return 'Basic Pro';
    case 'full-pro':
    case 'full_pro':
      return 'Full Pro';
    case 'starter':
      return 'Starter';
    case 'plus':
      return 'Plus';
    case 'pro':
      return 'Pro';
    case 'free':
    case undefined:
    case null:
    case '':
      return 'Free';
    default:
      return plan;
  }
}

module.exports = {
  FREE_SCAN_LIMIT,
  UNLIMITED_SCANS,
  PHOTO_CHECK_MONTHLY_CENTS,
  PHOTO_CHECK_ANNUAL_CENTS,
  PHOTO_CHECK_MONTHLY_AMOUNT,
  PHOTO_CHECK_ANNUAL_AMOUNT,
  PHOTO_CHECK_ANNUAL_SAVINGS_PERCENT,
  PHOTO_CHECK_MONTHLY_LOOKUP,
  PHOTO_CHECK_ANNUAL_LOOKUP,
  PHOTO_CHECK_PRODUCT_NAME,
  PAID_PLAN_IDS,
  LEGACY_PRICE_TO_PLAN,
  FALLBACK_TEST_PRICE_ID,
  PHOTO_CHECK_OFFERS,
  isPaidPlan,
  getLimitForPlan,
  hasScanCapacity,
  mapPriceIdToPlan,
  isAllowedCheckoutPriceId,
  formatPlanDisplayName,
};
