import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';
import * as svc from './restaurants.service';
import { MenuItem } from '../../models/MenuItem';
import { Review } from '../../models/Review';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const q = (req.query.q as string) || undefined;
  const city = (req.query.city as string) || undefined;
  const cuisine = (req.query.cuisine as string) || undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const page = Number(req.query.page ?? 1);
  const perPage = Number(req.query.perPage ?? 20);
  const sort = (req.query.sort as string) || undefined;
  const result = await svc.listRestaurants({ q, city, cuisine, minRating, page, perPage, sort, scope: 'public' });
  return ok(res, result.items, { meta: result.meta });
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await svc.getRestaurantById(req.params.id, 'public');
  const [menu, reviews] = await Promise.all([
    MenuItem.find({ restaurantId: restaurant._id, available: true }).sort({ category: 1, name: 1 }).lean(),
    Review.find({ restaurantId: restaurant._id }).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return ok(res, { restaurant: restaurant.toJSON(), menu, reviews });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await svc.createRestaurant({ ownerId: req.user!.id, payload: req.body, req });
  return created(res, restaurant.toJSON());
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await svc.updateRestaurant({
    id: req.params.id,
    ownerId: req.user!.id,
    isAdmin: req.user!.role === 'admin',
    payload: req.body,
    req,
  });
  return ok(res, restaurant.toJSON());
});

export const myRestaurant = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await svc.getOwnedRestaurant(req.user!.id);
  return ok(res, restaurant ? restaurant.toJSON() : null);
});
