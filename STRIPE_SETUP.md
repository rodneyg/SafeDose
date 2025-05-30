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
STRIPE_LIVE_PRICE_ID=price_1RUHgxAY2p4W374Yb5EWEtZ0
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

## Troubleshooting

### Error: "This API call cannot be made with a publishable API key"

This error occurs when the server-side Stripe configuration is using a publishable key instead of a secret key, or when the secret key is not properly configured.

**Common causes:**
1. **Missing secret key**: The `STRIPE_LIVE_SECRET_KEY` (for live mode) or `STRIPE_TEST_SECRET_KEY` (for test mode) environment variable is not set
2. **Wrong key type**: A publishable key (`pk_*`) was accidentally used as a secret key
3. **Environment variable mismatch**: The keys don't match the current `STRIPE_MODE` setting

**To debug:**
1. Check the server logs for detailed configuration information
2. Verify that your environment variables are properly set:
   ```bash
   # For live mode
   STRIPE_MODE=live
   STRIPE_LIVE_SECRET_KEY=sk_live_...  # Must start with 'sk_live_'
   STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_...
   
   # For test mode  
   STRIPE_MODE=test
   STRIPE_TEST_SECRET_KEY=sk_test_...  # Must start with 'sk_test_'
   STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
   ```
3. Ensure secret keys start with `sk_` and publishable keys start with `pk_`
4. In production (e.g., Vercel), set environment variables in your hosting platform's dashboard

**Quick fix:**
- If using live mode, ensure `STRIPE_LIVE_SECRET_KEY` is set to a valid secret key starting with `sk_live_`
- If using test mode, ensure `STRIPE_TEST_SECRET_KEY` is set to a valid secret key starting with `sk_test_`

### Other Common Issues

- **CORS errors**: Make sure your API endpoints are properly configured for your domain
- **Price ID mismatch**: Verify that test/live price IDs match your Stripe dashboard
- **Environment loading**: In serverless environments, ensure `.env` files are properly loaded or environment variables are set in the platform