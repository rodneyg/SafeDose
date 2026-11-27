# Stripe Configuration

SafeDose checkout uses server-side Stripe credentials, a webhook signing secret, and
Firebase Admin credentials. Copy the variable names from `.env.example`. Use only
placeholder values in local examples; set real values in your private environment
configuration.

## Required server variables

- `STRIPE_MODE`: `test` or `live`.
- `STRIPE_TEST_SECRET_KEY` or `STRIPE_LIVE_SECRET_KEY`: select the key matching
  `STRIPE_MODE`. Keep secret keys on the server.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the matching Stripe webhook
  destination. Checkout returns unavailable when this is missing or invalid.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`: a
  Firebase Admin service account for the same project as Firebase Auth. The private
  key may contain escaped `\n` line breaks.

`STRIPE_TEST_PUBLISHABLE_KEY` and `STRIPE_LIVE_PUBLISHABLE_KEY` are publishable
client values. The older `STRIPE_TEST_PRICE_ID` and `STRIPE_LIVE_PRICE_ID` variables
remain for compatibility; they are not the configuration for the current Photo Scan
offers.

## Current Photo Scan offers

Checkout resolves the monthly and annual Photo Scan offers using Stripe lookup keys
`safedose_photo_check_monthly` and `safedose_photo_check_annual`. The corresponding
environment overrides are `STRIPE_PHOTO_CHECK_MONTHLY_PRICE_ID` and
`STRIPE_PHOTO_CHECK_ANNUAL_PRICE_ID`. In test mode, a missing offer can be created
from its lookup key. Live checkout requires the live Stripe prices to exist or their
price IDs to be supplied through these variables.

Use the [Stripe fulfillment guide](docs/stripe-fulfillment.md) for webhook events,
deployment configuration, Firestore access rules, and checkout verification guidance.

## Security

- Never commit real `.env` values or put server secrets in `app.config` extra or
  browser-visible variables.
- Store live secrets in the hosting provider's server environment configuration.
- Keep Stripe mode, keys, webhook destination, and price IDs in the same test or live
  environment.
