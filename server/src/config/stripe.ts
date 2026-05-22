import Stripe from 'stripe';
import { config } from '../config';

let client: Stripe | null = null;

/**
 * Lazy Stripe client. Returns null if STRIPE_SECRET_KEY is not configured,
 * which lets the rest of the system run in development without a Stripe account.
 */
export function getStripe(): Stripe | null {
  if (client) return client;
  if (!config.stripe.secretKey || config.stripe.secretKey.includes('replace_me')) return null;
  client = new Stripe(config.stripe.secretKey, {
    // Omit apiVersion: the installed stripe SDK pins it internally based on
    // package version. This avoids drift between the literal string and the
    // SDK's Stripe.LatestApiVersion type when the package is upgraded.
    typescript: true,
  });
  return client;
}
