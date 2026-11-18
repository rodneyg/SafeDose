import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";
import stripeConfig from "./stripeConfig";

export const STRIPE_LOAD_ERROR = "Unable to load secure checkout. Please allow Stripe in your browser or network settings and try again.";

let stripePromise: Promise<Stripe> | undefined;

// The pure entry point avoids injecting Stripe.js until checkout is requested.
export function getCheckoutStripe(): Promise<Stripe> {
  if (!stripePromise) {
    stripePromise = Promise.resolve().then(async () => {
      if (!stripeConfig.publishableKey) {
        throw new Error("Payment system configuration error. Please contact support.");
      }
      try {
        const stripe = await loadStripe(stripeConfig.publishableKey);
        if (!stripe) throw new Error(STRIPE_LOAD_ERROR);
        return stripe;
      } catch {
        throw new Error(STRIPE_LOAD_ERROR);
      }
    }).catch((error) => {
      stripePromise = undefined;
      throw error;
    });
  }
  return stripePromise;
}
