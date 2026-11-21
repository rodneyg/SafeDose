# SafeDose Stripe fulfillment

SafeDose stores each Stripe customer against a verified Firebase account. Buyers
sign in before checkout. Checkout records are pending until a signed webhook
confirms payment or an eligible legacy Full Pro trial. The success screen reads
the status of that checkout for its owner. The scan paywall reads the account's
current entitlement. Stripe retries and out-of-order events reconcile against the
current subscription state, and cancellation revokes access when it takes effect.

## Configure the deployment

- Set the Stripe mode, the matching server key, and `STRIPE_WEBHOOK_SECRET` for
  the Stripe destination in Vercel. Use a sandbox destination for test deployments.
- Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`
  for a Firebase Admin service account for the same project as client Firebase Auth.
  It needs access to verify users and read and write Firestore billing records.
- Check the deployed Firestore Security Rules with an authenticated Firebase client.
  They must deny all client reads and writes under `/stripeBilling/{document=**}`.
  Review overlapping wildcard rules for unintended access.
- Make sure the Stripe destination for `/api/stripe-webhook` delivers
  `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`, `checkout.session.expired`,
  `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `customer.subscription.paused`,
  `customer.subscription.resumed`, `invoice.paid`, and `invoice.payment_failed`.

Checkout reports unavailable if the server credentials or webhook signing secret
are missing. Test and live records are stored separately. Confirm sandbox checkout,
delayed payment, renewal, and cancellation before taking production payments.
Historical checkout sessions with no recorded Firebase UID require verified buyer
ownership before reconciliation.
