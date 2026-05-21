import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import * as svc from './cart.service';

export const get = asyncHandler(async (req: Request, res: Response) => {
  const cart = await svc.getCart(req.user!.id);
  return ok(res, cart);
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await svc.addItem({
    userId: req.user!.id,
    menuItemId: req.body.menuItemId,
    quantity: req.body.quantity,
  });
  return ok(res, cart);
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await svc.updateItem({
    userId: req.user!.id,
    itemId: req.params.id,
    quantity: req.body.quantity,
  });
  return ok(res, cart);
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await svc.removeItem({ userId: req.user!.id, itemId: req.params.id });
  return ok(res, cart);
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  const cart = await svc.clearCart(req.user!.id);
  return ok(res, cart);
});
