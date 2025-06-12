## Pricing and Subscription Flow

The application incorporates a subscription model, offering different tiers of access and features to users. This is indicated by several elements within the codebase, including usage limit modals, subscription management options in settings, and dedicated screens for pricing and payment processing.

### Indicators of a Subscription Model:

*   **Usage Limit Modals (`LimitModal`, `LogLimitModal`):** These modals appear when users encounter usage restrictions (e.g., on the number of AI scans or logged doses). They often check conditions like `usageData.plan !== 'free'` or `isPremium`, implying that paid plans ("Premium") bypass these free-tier limitations.
*   **Settings Screen (`app/settings.tsx`):** This screen includes a "Cancel Subscription" button, directly pointing to a subscription-based service.
*   **Dedicated Pricing Screen (`app/pricing.tsx`):** The existence of this file signifies a specific location where users can view and choose subscription plans.
*   **Backend Payment Processing (Stripe):** Files like `STRIPE_SETUP.md` and `api/stripe-webhook.js` strongly suggest the use of Stripe for handling payments and subscription management on the backend.

### Entry Points to the Pricing Screen (`app/pricing.tsx`)

Users are typically directed to the pricing screen from various points within the app when they either hit a usage limit or proactively seek to upgrade:

1.  **From Usage Limit Modals (`LimitModal`, `LogLimitModal`):**
    *   When a user on a free plan exhausts their allowed usage (e.g., maximum free scans or log entries), the respective modal (`LimitModal` or `LogLimitModal`) is displayed.
    *   These modals are expected to contain an "Upgrade," "View Plans," or similar call-to-action button that navigates the user directly to `app/pricing.tsx`.
2.  **From the Settings Screen (`app/settings.tsx`):**
    *   The settings area likely includes options such as "Manage Subscription," "View Subscription Plans," or "Upgrade Account."
    *   Selecting one of these options would navigate the user to `app/pricing.tsx` to see available subscription tiers.
3.  **Promotional Elements:**
    *   The application might feature other promotional banners, cards, or messages within its UI (e.g., on the main dashboard or specific feature screens) that highlight the benefits of premium plans and link to `app/pricing.tsx`.

### Pricing Screen (`app/pricing.tsx`) - Assumed Content & Functionality

The `app/pricing.tsx` screen is the central place for users to understand and select a subscription plan.

*   **Purpose:** To clearly present the available subscription plans, detailing the features, benefits, and costs associated with each.
*   **Expected Content:**
    *   **Plan Comparison:** A side-by-side comparison of different available tiers (e.g., "Free," "Premium," "Pro").
    *   **Feature List:** A breakdown of features included in each plan, such as:
        *   Number of AI scans allowed (e.g., per day/month, or unlimited).
        *   Number of dose logs that can be stored.
        *   Access to exclusive or advanced features.
        *   Customer support levels.
    *   **Pricing Details:** Clear indication of the cost for each plan, often with options for monthly or annual billing cycles (potentially with a discount for annual commitments).
    *   **Call-to-Action Buttons:** Prominent buttons like "Choose Plan," "Subscribe," or "Upgrade" for each plan, allowing users to select their desired option.
*   **Payment Integration:**
    *   Upon selecting a plan, the user would proceed to a payment step.
    *   This step is expected to integrate with a third-party payment provider, heavily implied to be **Stripe** based on backend file names.
    *   Users would securely enter their payment details (credit card information, etc.) through an interface likely provided or heavily influenced by the Stripe integration (e.g., Stripe Elements or a redirect to a Stripe Checkout page).

### Post-Subscription Actions

Once a user successfully subscribes to a paid plan:

1.  **Account Update:**
    *   The user's profile or account status within the application's backend and potentially in the local `userProfile` (e.g., `userProfile.plan`) is updated to reflect the new subscription tier.
    *   The `isPremium` flag or equivalent would be set to true.
2.  **Feature Unlocking:**
    *   The application immediately unlocks features and lifts restrictions according to the benefits of the newly subscribed plan. For example, scan limits might be increased or removed.
3.  **Navigation/Confirmation:**
    *   The user might be navigated to a dedicated success screen (the `app/success.tsx` screen could serve this purpose) confirming their successful subscription.
    *   Alternatively, they might be redirected back to the screen from which they initiated the upgrade process, now with enhanced access.
    *   An email confirmation of the subscription is also typically sent.

### Subscription Cancellation

*   **Entry Point:** The "Cancel Subscription" button located on the `app/settings.tsx` screen is the user-facing starting point for this process.
*   **Process:**
    *   As noted by the `// TODO: Add real cancellation or downgrade logic` comment in `app/settings.tsx`, the full implementation is pending.
    *   A complete cancellation flow would involve:
        *   User confirmation of their intent to cancel.
        *   Backend communication with the payment provider (Stripe) to request the cancellation of the subscription. This would typically stop future recurring billing.
        *   The user's plan might remain active until the end of the current paid billing cycle, after which it would revert to a free tier or a restricted state.
        *   Updating the user's plan status in the application's database.
        *   Providing confirmation to the user that their subscription has been cancelled or is scheduled for cancellation.

This flow ensures users can understand plan benefits, make informed purchase decisions, and manage their subscription status within the application. The integration with a robust payment provider like Stripe is crucial for handling the financial transactions securely and reliably.
