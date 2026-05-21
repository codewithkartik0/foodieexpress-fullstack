import { Router } from 'express';
import * as ctrl from './cart.controller';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { addItemSchema, idParamSchema, updateItemSchema } from './cart.validators';

const router = Router();

router.use(requireAuth, requireRole('customer'));

router.get('/', ctrl.get);
router.post('/items', validate({ body: addItemSchema }), ctrl.addItem);
router.patch('/items/:id', validate({ params: idParamSchema, body: updateItemSchema }), ctrl.updateItem);
router.delete('/items/:id', validate({ params: idParamSchema }), ctrl.removeItem);
router.delete('/', ctrl.clear);

export default router;
