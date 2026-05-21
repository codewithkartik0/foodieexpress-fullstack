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
    apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
    typescript: true,
  });
  return client;
}
