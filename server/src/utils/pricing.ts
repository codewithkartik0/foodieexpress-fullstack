import { config } from '../config';

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

export interface PricingBreakdown {
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
}

/**
 * Compute the pricing breakdown for a cart-like line array.
 *
 * Tax rate defaults to env TAX_RATE (e.g. 0.05 for 5% GST).
 * Delivery fee defaults to env DELIVERY_FEE (waived above subtotal of ₹499).
 */
export function computePricing(lines: CartLine[]): PricingBreakdown {
  const subtotal = lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0);
  const tax = +(subtotal * config.pricing.taxRate).toFixed(2);
  const deliveryFee = subtotal === 0 || subtotal >= 499 ? 0 : config.pricing.deliveryFee;
  const total = +(subtotal + tax + deliveryFee).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    tax,
    deliveryFee,
    total,
  };
}
