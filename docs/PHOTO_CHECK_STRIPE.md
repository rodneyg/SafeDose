# SafeDose Photo Check Stripe setup

The web offer is a free calculator plus an optional **$2.99/month** or **$26.99/year** (25% off) Photo Check subscription. Checkout reuses the existing `/api/create-checkout-session` route and `STRIPE_MODE` / `STRIPE_TEST_*` / `STRIPE_LIVE_*` keys.

Do this in the **SafeDose Stripe account**, not another Stripe account.

## Test mode (preview and local)

No dashboard work is required for smoke tests. When `STRIPE_MODE=test` (the default) and the photo-check price IDs are unset, the checkout API looks up — and if needed creates — test prices with these lookup keys:

- `safedose_photo_check_monthly` → $2.99 / month
- `safedose_photo_check_annual` → $26.99 / year

The product name is `SafeDose Photo Check`. Existing test prices with those lookup keys are reused.

## Live mode (required before taking real payments)

In the SafeDose Stripe Dashboard, switch to **Live**, then create:

1. Product: `SafeDose Photo Check`
2. Recurring price: **$2.99 USD / month**, lookup key `safedose_photo_check_monthly`
3. Recurring price: **$26.99 USD / year**, lookup key `safedose_photo_check_annual`

Optional but recommended: set these Vercel production env vars to the live price IDs so checkout does not depend on a lookup:

- `STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID`
- `STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID`

Keep `STRIPE_MODE=live` on production only after those live prices exist. Preview deployments should stay in test mode. Do not put secret keys in `app.config.js` `extra` or the client bundle.

If live prices are missing, checkout returns HTTP 503 with a configuration error instead of creating a live price automatically.

Legacy Starter / Basic Pro / Full Pro live price IDs remain valid so existing subscribers are still treated as paid (unlimited photo scans). New checkouts only sell Photo Check.
