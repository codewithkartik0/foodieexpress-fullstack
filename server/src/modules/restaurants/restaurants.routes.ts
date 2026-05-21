import { Router } from 'express';
import * as ctrl from './restaurants.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import {
  createRestaurantSchema,
  idParamSchema,
  listRestaurantsQuerySchema,
  updateRestaurantSchema,
} from './restaurants.validators';

const router = Router();

router.get('/', validate({ query: listRestaurantsQuerySchema }), ctrl.list);
router.get('/me/owner', requireAuth, requireRole('restaurant'), ctrl.myRestaurant);
router.get('/:id', validate({ params: idParamSchema }), ctrl.detail);
router.post(
  '/',
  requireAuth,
  requireRole('restaurant'),
  validate({ body: createRestaurantSchema }),
  ctrl.create,
);
router.patch(
  '/:id',
  requireAuth,
  requireRole('restaurant', 'admin'),
  validate({ params: idParamSchema, body: updateRestaurantSchema }),
  ctrl.update,
);

export default router;
