import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import * as svc from './payments.service';
import { config } from '../../config';

export const createIntent = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.createPaymentIntent({
    orderId: req.body.orderId,
    userId: req.user!.id,
    req,
  });
  return ok(res, {
    ...result,
    publishableKey: undefined, // frontend already loads its own publishable key
    stripeConfigured: !!config.stripe.secretKey && !config.stripe.secretKey.includes('replace_me'),
  });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  // Note: this route receives the raw body via the special middleware in app.ts
  await svc.handleWebhook({
    rawBody: req.body as Buffer,
    signature: req.headers['stripe-signature'] as string | undefined,
  });
  return res.status(200).json({ received: true });
});

export const devMarkPaid = asyncHandler(async (req: Request, res: Response) => {
  await svc.devMarkPaid({ paymentId: req.body.paymentId, userId: req.user!.id });
  return ok(res, { message: 'marked paid (dev)' });
});
