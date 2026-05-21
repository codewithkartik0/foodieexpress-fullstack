import { Router } from 'express';
import * as ctrl from './payments.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { createIntentSchema, devMarkPaidSchema } from './payments.validators';

/**
 * Note: the webhook route is mounted SEPARATELY in app.ts using express.raw()
 * because Stripe signature verification requires the raw bytes of the request.
 * This router only contains the authenticated routes.
 */
const router = Router();

router.post(
  '/intent',
  requireAuth,
  requireRole('customer'),
  validate({ body: createIntentSchema }),
  ctrl.createIntent,
);

router.post(
  '/dev/mark-paid',
  requireAuth,
  requireRole('customer'),
  validate({ body: devMarkPaidSchema }),
  ctrl.devMarkPaid,
);

export default router;
