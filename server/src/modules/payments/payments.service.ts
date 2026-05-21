import Stripe from 'stripe';
import { Order } from '../../models/Order';
import { Payment, StripePaymentStatus } from '../../models/Payment';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { audit } from '../../utils/audit';
import { getStripe } from '../../config/stripe';
import { config } from '../../config';
import { logger } from '../../config/logger';
import { orderReceiptEmail, sendEmail } from '../../utils/email';
import { Request } from 'express';

/** Convert rupees to the smallest currency unit (paise for INR). */
function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

export async function createPaymentIntent(args: {
  orderId: string;
  userId: string;
  req?: Request;
}): Promise<{ clientSecret: string; paymentId: string; publishableKey?: string }> {
  const order = await Order.findById(args.orderId);
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.userId.toString() !== args.userId) {
    throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }
  if (order.paymentMethod !== 'stripe') {
    throw AppError.badRequest('This order is not configured for online payment', 'NOT_STRIPE_ORDER');
  }
  if (order.paymentStatus === 'paid') {
    throw AppError.conflict('Order is already paid', 'ALREADY_PAID');
  }

  const stripe = getStripe();
  const amountMinor = toMinor(order.total);

  if (!stripe) {
    // Dev fallback – simulate a PaymentIntent so the frontend can still demo the flow.
    let payment = await Payment.findOne({ orderId: order._id });
    if (!payment) {
      payment = await Payment.create({
        orderId: order._id,
        userId: order.userId,
        method: 'card',
        amount: order.total,
        amountMinor,
        currency: config.stripe.currency,
        status: 'requires_payment_method',
      });
      order.paymentId = payment._id;
      await order.save();
    }
    await audit({
      type: 'payment.intent.create',
      userId: args.userId,
      role: 'customer',
      req: args.req,
      meta: { orderId: order.id, amount: order.total, mock: true },
    });
    return {
      clientSecret: `dev_mock_secret_${payment.id}`,
      paymentId: payment.id,
      publishableKey: undefined,
    };
  }

  // Real Stripe path
  let payment = await Payment.findOne({ orderId: order._id });
  let intent: Stripe.PaymentIntent;
  if (payment?.stripePaymentIntentId) {
    intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    if (intent.status === 'succeeded') {
      throw AppError.conflict('Order is already paid', 'ALREADY_PAID');
    }
    if (intent.amount !== amountMinor) {
      // Recreate with the new amount
      await stripe.paymentIntents.cancel(intent.id).catch(() => undefined);
      intent = await stripe.paymentIntents.create({
        amount: amountMinor,
        currency: config.stripe.currency,
        metadata: { orderId: order.id, userId: args.userId },
        automatic_payment_methods: { enabled: true },
      });
      payment.stripePaymentIntentId = intent.id;
      payment.amount = order.total;
      payment.amountMinor = amountMinor;
      await payment.save();
    }
  } else {
    intent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: config.stripe.currency,
      metadata: { orderId: order.id, userId: args.userId },
      automatic_payment_methods: { enabled: true },
    });
    payment = await Payment.create({
      orderId: order._id,
      userId: order.userId,
      method: 'card',
      stripePaymentIntentId: intent.id,
      amount: order.total,
      amountMinor,
      currency: config.stripe.currency,
      status: intent.status as StripePaymentStatus,
    });
    order.paymentId = payment._id;
    await order.save();
  }

  await audit({
    type: 'payment.intent.create',
    userId: args.userId,
    role: 'customer',
    req: args.req,
    meta: { orderId: order.id, amount: order.total, paymentIntentId: intent.id },
  });

  return {
    clientSecret: intent.client_secret ?? '',
    paymentId: payment.id,
  };
}

/**
 * Handle a Stripe webhook event. Designed to be idempotent so that re-deliveries
 * from Stripe do not create duplicate payment rows or duplicate emails.
 */
export async function handleWebhook(args: {
  rawBody: Buffer;
  signature: string | undefined;
}): Promise<void> {
  const stripe = getStripe();
  if (!stripe || !config.stripe.webhookSecret) {
    logger.warn('Webhook received but Stripe / secret not configured – skipping');
    return;
  }
  if (!args.signature) {
    throw AppError.unauthorized('Missing stripe-signature header', 'NO_SIGNATURE');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(args.rawBody, args.signature, config.stripe.webhookSecret);
  } catch (err) {
    logger.warn('Webhook signature verification failed', err as Error);
    throw AppError.unauthorized('Invalid webhook signature', 'BAD_SIGNATURE');
  }

  const intent = event.data.object as Stripe.PaymentIntent;
  const payment = intent?.id ? await Payment.findOne({ stripePaymentIntentId: intent.id }) : null;

  if (!payment) {
    logger.warn(`Webhook event ${event.type} for unknown PaymentIntent ${intent?.id}`);
    return;
  }

  // Idempotency – if this raw event ID is already recorded, skip
  if (payment.rawEventIds.includes(event.id)) {
    logger.info(`Webhook event ${event.id} already processed – skipping`);
    return;
  }
  payment.rawEventIds.push(event.id);

  switch (event.type) {
    case 'payment_intent.succeeded': {
      payment.status = 'succeeded';
      payment.paidAt = new Date();
      payment.stripeChargeId = (intent.latest_charge as string) ?? null;
      await payment.save();

      // Update order
      const order = await Order.findById(payment.orderId);
      if (order && order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        await order.save();

        // Send receipt email + notification
        const user = await User.findById(order.userId);
        if (user) {
          const itemsHtml = order.items
            .map(
              (i) =>
                `<li>${escapeHtml(i.name)} × ${i.quantity} — ₹${(i.unitPrice * i.quantity).toFixed(2)}</li>`,
            )
            .join('');
          const itemsText = order.items
            .map((i) => `- ${i.name} x ${i.quantity} – ₹${(i.unitPrice * i.quantity).toFixed(2)}`)
            .join('\n');
          void sendEmail({
            ...orderReceiptEmail({
              name: user.fullName,
              orderNumber: order.orderNumber,
              total: order.total,
              itemsHtml: `<ul>${itemsHtml}</ul>`,
              itemsText,
            }),
            to: user.email,
          });
          await Notification.create({
            userId: user._id,
            type: 'payment.succeeded',
            title: `Payment received for #${order.orderNumber}`,
            body: `₹${order.total.toFixed(2)} paid successfully.`,
            link: `/orders/${order.id}`,
          });
        }
      }
      await audit({
        type: 'payment.succeeded',
        userId: payment.userId.toString(),
        meta: { orderId: payment.orderId.toString(), amount: payment.amount, eventId: event.id },
      });
      break;
    }

    case 'payment_intent.payment_failed': {
      payment.status = 'failed';
      await payment.save();
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'failed';
        await order.save();
      }
      await audit({
        type: 'payment.failed',
        userId: payment.userId.toString(),
        outcome: 'failure',
        meta: { orderId: payment.orderId.toString(), eventId: event.id },
      });
      break;
    }

    case 'payment_intent.canceled': {
      payment.status = 'canceled';
      await payment.save();
      break;
    }

    case 'charge.refunded': {
      payment.status = 'refunded';
      payment.refundedAt = new Date();
      await payment.save();
      const order = await Order.findById(payment.orderId);
      if (order) {
        order.paymentStatus = 'refunded';
        await order.save();
      }
      await audit({
        type: 'payment.refund',
        userId: payment.userId.toString(),
        meta: { orderId: payment.orderId.toString(), eventId: event.id },
      });
      break;
    }

    default:
      logger.info(`Unhandled Stripe event type: ${event.type}`);
  }
}

/**
 * Dev-only helper: simulate a successful payment for a paymentId.
 * Used when Stripe is not configured so the demo flow still works end-to-end.
 */
export async function devMarkPaid(args: { paymentId: string; userId: string }): Promise<void> {
  if (config.isProd) {
    throw AppError.forbidden('devMarkPaid disabled in production', 'NOT_AVAILABLE');
  }
  const payment = await Payment.findById(args.paymentId);
  if (!payment) throw AppError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');
  if (payment.userId.toString() !== args.userId) {
    throw AppError.notFound('Payment not found', 'PAYMENT_NOT_FOUND');
  }
  payment.status = 'succeeded';
  payment.paidAt = new Date();
  await payment.save();
  const order = await Order.findById(payment.orderId);
  if (order && order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    await order.save();
    await Notification.create({
      userId: order.userId,
      type: 'payment.succeeded',
      title: `Payment received (dev) for #${order.orderNumber}`,
      body: `₹${order.total.toFixed(2)} paid successfully.`,
      link: `/orders/${order.id}`,
    });
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string),
  );
}
