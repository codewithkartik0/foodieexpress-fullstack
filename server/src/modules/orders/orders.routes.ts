import { Router } from 'express';
import * as ctrl from './orders.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  cancelSchema,
  idParamSchema,
  listOrdersQuerySchema,
  placeOrderSchema,
  updateStatusSchema,
} from './orders.validators';

const router = Router();

router.use(requireAuth);

router.post('/', requireRole('customer'), validate({ body: placeOrderSchema }), ctrl.place);
router.get('/', validate({ query: listOrdersQuerySchema }), ctrl.list);
router.get('/:id', validate({ params: idParamSchema }), ctrl.detail);

router.patch(
  '/:id/status',
  requireRole('restaurant', 'admin'),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  ctrl.updateStatus,
);

router.post(
  '/:id/cancel',
  requireRole('customer'),
  validate({ params: idParamSchema, body: cancelSchema }),
  ctrl.cancel,
);

export default router;
