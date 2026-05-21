import { Schema, model, Document, Types } from 'mongoose';

export const STRIPE_STATUSES = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
  'processing',
  'succeeded',
  'canceled',
  'failed',
  'refunded',
] as const;
export type StripePaymentStatus = (typeof STRIPE_STATUSES)[number];

export interface PaymentDoc extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  userId: Types.ObjectId;
  method: 'card' | 'cod';
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  amount: number; // stored in INR (rupees) for readability
  amountMinor: number; // stored in paise (smallest currency unit) – used for Stripe API
  currency: string;
  status: StripePaymentStatus;
  paidAt?: Date | null;
  refundedAt?: Date | null;
  rawEventIds: string[]; // idempotency log
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, enum: ['card', 'cod'], required: true },
    stripePaymentIntentId: { type: String, default: null, unique: true, sparse: true },
    stripeChargeId: { type: String, default: null },
    amount: { type: Number, required: true, min: 0 },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'inr' },
    status: { type: String, enum: STRIPE_STATUSES, default: 'requires_payment_method', required: true, index: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    rawEventIds: { type: [String], default: [] },
  },
  { timestamps: true, strict: true },
);

export const Payment = model<PaymentDoc>('Payment', paymentSchema);
