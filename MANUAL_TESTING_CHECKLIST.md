# Manual Testing Checklist for app/pricing.tsx

This checklist is to manually verify the functionality and appearance of the updated pricing page.

## A. Prerequisites
1.  **Build and run the application** on a device or simulator.
2.  **Navigate to the Pricing Page.**
3.  Open developer tools to monitor console logs and analytics events if possible.

## B. Initial State Verification
*   [ ] **Page Title:** Is the title "Choose Your Plan"?
*   [ ] **Default Selected Plan:** Is the Monthly plan ($20/month) selected by default?
    *   [ ] Does it appear elevated (e.g., stronger shadow, border) compared to other cards?
    *   [ ] Does it show the "✓ Selected" indicator?
*   [ ] **Monthly Plan Badge:** Does the Monthly plan correctly display the "Most Popular" badge (purple background, white text) in the top-right corner?
*   [ ] **CTA Button Text:** Is the main call-to-action button text "Try Free Now"?
*   [ ] **CTA Subtext (Monthly Plan Trial):** Does the subtext "1 week free trial, then $20/month" appear below the "Try Free Now" button?

## C. Yearly Plan Card Verification
*   [ ] **Display:** Is the Yearly plan card visible with the correct name ("Yearly Plan"), price ("$149.99/year"), and subtext ("SAVE 38%")?
*   [ ] **Features:** Are the features listed correctly for the Yearly plan (should be same as Monthly)?
*   [ ] **Badge:** Does it correctly display the "SAVE 38%" badge (green background, white text) in the top-right corner?
*   [ ] **Selection Indicator:** Does it show "Select" (or similar unselected state indicator, gray text)?

## D. Plan Selection Behavior & Dynamic UI Changes
*   [ ] **Select Yearly Plan:**
    *   [ ] Tap the Yearly plan card. Does it become selected (elevated, "✓ Selected" indicator)?
    *   [ ] Does the Monthly plan become unselected (no elevation, "Select" indicator)?
    *   [ ] Does the CTA subtext ("1 week free trial...") disappear?
*   [ ] **Reselect Monthly Plan:**
    *   [ ] Tap the Monthly plan card. Does it become selected again (elevated, "✓ Selected" indicator)?
    *   [ ] Does the Yearly plan (previously selected) become unselected?
    *   [ ] Does the CTA subtext ("1 week free trial...") reappear?

## E. Styling, Layout, and Visuals
*   [ ] **Card Appearance:** Do all cards have consistent styling (padding, rounded corners, background color)?
*   [ ] **Selected Card Style:** Is the selected card clearly differentiated (e.g., border color `#8B5CF6`, increased elevation/shadow)?
*   [ ] **Badge Appearance & Positioning:**
    *   [ ] Are badges styled correctly (background colors: purple for "Most Popular", green for "SAVE 38%"; white text; padding; border radius)?
    *   [ ] Are badges positioned correctly in the top-right area of their respective cards?
*   [ ] **Text Elements:**
    *   [ ] **Plan Names:** Are they clear and consistently styled (`fontSize: 22`, `fontWeight: '600'`)?
    *   [ ] **Prices & Suffixes:** Are prices prominent (`fontSize: 40`, bold) and suffixes clear (`fontSize: 18`)?
    *   [ ] **Subtexts:** Are they styled consistently and legibly (`fontSize: 14`)?
    *   [ ] **Feature Lists:** Is the styling of feature items consistent?
*   [ ] **Selection Indicators:** Is the text ("✓ Selected" vs "Select") clear and styled as expected (brand color and bold when selected, gray when not)?
*   [ ] **Spacing:**
    *   [ ] Is there adequate and consistent vertical `marginBottom` (24px) between the plan cards?
    *   [ ] Is spacing within cards (around text, features, price) appropriate?
*   [ ] **Responsiveness (if possible to test):**
    *   [ ] If tested on different screen sizes or orientations, do the cards stack correctly and remain readable (cards should be `width: '100%'` up to `maxWidth: 400`)?

## F. "Try Free Now" Button Interaction (Visual/State Check)
*(Actual checkout flow depends on backend Stripe setup and API responses, focus on UI changes)*
*   [ ] **With Monthly Plan Selected:**
    *   [ ] Click "Try Free Now". Does the button text change to "Processing..." temporarily?
*   [ ] **With Yearly Plan Selected:**
    *   [ ] Click "Try Free Now". Does the button text also change to "Processing..." temporarily?
*   [ ] **Error Message Display:** If an error occurs during `initiateStripeCheckout` (e.g., Stripe not initialized, API error), is the `errorMessage` state updated and displayed correctly in `styles.errorText`?

## G. Analytics Event Logging (Developer Tool Check)
*   [ ] **View Pricing Page:** When the page initially loads, is an analytics event for `VIEW_PRICING_PAGE` logged?
*   [ ] **Initiate Upgrade (per plan):**
    *   [ ] With Monthly plan selected, click "Try Free Now". Is an `INITIATE_UPGRADE` event logged with parameters like `{ plan: 'monthly' }`?
    *   [ ] With Yearly plan selected, click "Try Free Now". Is an `INITIATE_UPGRADE` event logged with parameters like `{ plan: 'yearly' }`?
*   [ ] **Upgrade Failure (if mockable):** If an upgrade fails, is an `UPGRADE_FAILURE` event logged with the correct plan ID and error message?

## H. Developer Console Verification
*   [ ] **Stripe Placeholder Warning:** When the component mounts, is the following `console.warn` message visible in the developer console: `"TODO: Replace placeholder Stripe Price IDs ('price_yearly_placeholder') in pricingPlansData with actual Price IDs from your Stripe dashboard."`?

This checklist should help ensure all implemented features and changes on the pricing page are working as expected.
