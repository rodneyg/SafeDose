# Stripe Configuration

This project supports both Stripe test and live modes through a feature flag system.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Stripe Mode (test or live)
STRIPE_MODE=test

# Test Mode Keys
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...
STRIPE_TEST_PRICE_ID=price_1REyzMPE5x6FmwJPyJVJIEXe

# Live Mode Keys (for production)
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
STRIPE_LIVE_SECRET_KEY=sk_live_...
STRIPE_LIVE_PRICE_ID=price_live_...
```

## Usage

### Switching Modes

- **Test Mode**: Set `STRIPE_MODE=test` to use test keys and test price IDs
- **Live Mode**: Set `STRIPE_MODE=live` to use live keys and live price IDs

### Backward Compatibility

The system maintains backward compatibility with legacy environment variables:
- `STRIPE_PUBLISHABLE_KEY` (fallback for test mode)
- `STRIPE_SECRET_KEY` (fallback for test mode)

### Security

- The `.env` file is automatically excluded from version control
- Keys are only logged in truncated form for debugging
- Live keys should be stored in your hosting platform's environment variables (e.g., Vercel)

### Testing Payments

#### Test Mode
1. Set `STRIPE_MODE=test`
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry date and CVC

#### Live Mode
1. Set `STRIPE_MODE=live`
2. Use real credit card
3. Complete actual transaction (remember to refund if testing)

## Configuration Files

- `lib/stripeConfig.js` - Client-side configuration
- `lib/stripeConfig.server.js` - Server-side configuration
- `app.config.js` - Expo configuration with environment variables
- `types/env.d.ts` - TypeScript definitions