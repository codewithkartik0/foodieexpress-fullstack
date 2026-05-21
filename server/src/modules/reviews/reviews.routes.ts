import { Request, Response } from 'express';
import Joi from 'joi';
import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import * as svc from './reviews.service';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const createReviewSchema = Joi.object({
  orderId: objectId.required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(1000).allow('').optional(),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(10),
});

const restaurantIdParam = Joi.object({ id: objectId.required() });

const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await svc.createReview({
    userId: req.user!.id,
    orderId: req.body.orderId,
    rating: req.body.rating,
    comment: req.body.comment,
    req,
  });
  return created(res, review.toJSON());
});

const listForRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.listForRestaurant(
    req.params.id,
    Number(req.query.page ?? 1),
    Number(req.query.perPage ?? 10),
  );
  return ok(res, result.items, { meta: result.meta });
});

const router = Router();

router.post(
  '/',
  requireAuth,
  requireRole('customer'),
  validate({ body: createReviewSchema }),
  create,
);

router.get(
  '/restaurant/:id',
  validate({ params: restaurantIdParam, query: listQuerySchema }),
  listForRestaurant,
);

export default router;
