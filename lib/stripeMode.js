// Shared Stripe mode selection for the client and server Stripe configs.
// Holds no keys or secrets: it only decides between 'test' and 'live'.

const VALID_STRIPE_MODES = ['test', 'live'];
const DEFAULT_STRIPE_MODE = 'test';

/**
 * Turn a raw STRIPE_MODE value into the mode the app should use.
 * Missing or empty values use 'test'. Anything other than 'test' or 'live'
 * logs an error and falls back to 'test'.
 *
 * @param {unknown} rawMode
 * @param {{ error: (message: string) => void }} [logger]
 * @returns {'test' | 'live'}
 */
function resolveStripeMode(rawMode, logger = console) {
  const requestedMode = rawMode || DEFAULT_STRIPE_MODE;

  if (!VALID_STRIPE_MODES.includes(requestedMode)) {
    logger.error(`Invalid STRIPE_MODE: ${requestedMode}. Must be 'test' or 'live'. Defaulting to 'test'.`);
    return DEFAULT_STRIPE_MODE;
  }

  return requestedMode;
}

module.exports = {
  VALID_STRIPE_MODES,
  DEFAULT_STRIPE_MODE,
  resolveStripeMode,
};
