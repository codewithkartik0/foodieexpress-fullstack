import { Router } from 'express';
import * as ctrl from './menuItems.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  createMenuItemSchema,
  idParamSchema,
  listMenuQuerySchema,
  updateMenuItemSchema,
} from './menuItems.validators';

const router = Router();

router.get('/', validate({ query: listMenuQuerySchema }), ctrl.list);
router.get('/me', requireAuth, requireRole('restaurant'), ctrl.myMenu);
router.post(
  '/',
  requireAuth,
  requireRole('restaurant', 'admin'),
  validate({ body: createMenuItemSchema }),
  ctrl.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('restaurant', 'admin'),
  validate({ params: idParamSchema, body: updateMenuItemSchema }),
  ctrl.update,
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('restaurant', 'admin'),
  validate({ params: idParamSchema }),
  ctrl.remove,
);

export default router;
