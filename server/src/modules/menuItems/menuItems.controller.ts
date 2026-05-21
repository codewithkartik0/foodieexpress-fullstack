import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/response';
import * as svc from './menuItems.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await svc.listMenu({
    restaurantId: (req.query.restaurantId as string) || undefined,
    category: (req.query.category as string) || undefined,
    available: req.query.available === undefined ? undefined : req.query.available === 'true',
    q: (req.query.q as string) || undefined,
  });
  return ok(res, items);
});

export const myMenu = asyncHandler(async (req: Request, res: Response) => {
  const items = await svc.listMenu({ ownerId: req.user!.id, isOwnerView: true });
  return ok(res, items);
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await svc.createMenuItem({
    ownerId: req.user!.id,
    isAdmin: req.user!.role === 'admin',
    payload: req.body,
    req,
  });
  return created(res, item.toJSON());
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await svc.updateMenuItem({
    id: req.params.id,
    ownerId: req.user!.id,
    isAdmin: req.user!.role === 'admin',
    payload: req.body,
    req,
  });
  return ok(res, item.toJSON());
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteMenuItem({
    id: req.params.id,
    ownerId: req.user!.id,
    isAdmin: req.user!.role === 'admin',
    req,
  });
  return noContent(res);
});
