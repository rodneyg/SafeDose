const {
  PHOTO_CHECK_OFFERS,
  PHOTO_CHECK_PRODUCT_NAME,
  isAllowedCheckoutPriceId,
} = require('./plans');

async function ensureTestPrice(stripe, offer) {
  const existingProducts = await stripe.products.search({
    query: `name:'${PHOTO_CHECK_PRODUCT_NAME}' AND active:'true'`,
    limit: 1,
  }).catch(() => ({ data: [] }));

  let product = existingProducts.data && existingProducts.data[0];
  if (!product) {
    const listed = await stripe.products.list({ active: true, limit: 100 });
    product = (listed.data || []).find((item) => item.name === PHOTO_CHECK_PRODUCT_NAME);
  }
  if (!product) {
    product = await stripe.products.create({
      name: PHOTO_CHECK_PRODUCT_NAME,
      description: 'Optional SafeDose web photo scans. The calculator stays free.',
      metadata: { offer: 'photo_check' },
    });
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: offer.unitAmount,
    recurring: { interval: offer.interval },
    nickname: offer.nickname,
    lookup_key: offer.lookupKey,
    transfer_lookup_key: true,
    metadata: { offerKey: offer.offerKey },
  });
  return price.id;
}

async function resolveCheckoutPriceId(stripe, body, options) {
  const mode = (options && options.mode) || 'test';
  const env = (options && options.env) || process.env || {};
  const offerKey = body && body.offerKey;
  const priceId = body && body.priceId;

  if (offerKey) {
    if (typeof offerKey !== 'string' || !Object.hasOwn(PHOTO_CHECK_OFFERS, offerKey)) {
      const err = new Error(`Unknown offerKey: ${offerKey}`);
      err.statusCode = 400;
      throw err;
    }
    const offer = PHOTO_CHECK_OFFERS[offerKey];
    if (env[offer.envVar]) {
      return { priceId: env[offer.envVar], offerKey, created: false };
    }
    const listed = await stripe.prices.list({
      lookup_keys: [offer.lookupKey],
      active: true,
      limit: 1,
    });
    if (listed.data && listed.data[0]) {
      return { priceId: listed.data[0].id, offerKey, created: false };
    }
    if (mode !== 'test') {
      const err = new Error(
        'Photo-scan Stripe prices are not configured for live mode. In the SafeDose Stripe account, create a product "SafeDose Photo Scan" with a $2.99/month recurring price (lookup key safedose_photo_check_monthly) and a $26.99/year recurring price (lookup key safedose_photo_check_annual), or set STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID and STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID.'
      );
      err.statusCode = 503;
      throw err;
    }
    const createdId = await ensureTestPrice(stripe, offer);
    return { priceId: createdId, offerKey, created: true };
  }

  if (priceId) {
    if (typeof priceId !== 'string' || !isAllowedCheckoutPriceId(priceId, env)) {
      const err = new Error('Unsupported priceId');
      err.statusCode = 400;
      throw err;
    }
    return { priceId, offerKey: null, created: false };
  }

  const err = new Error('Missing parameters');
  err.statusCode = 400;
  throw err;
}

module.exports = { resolveCheckoutPriceId, ensureTestPrice };
