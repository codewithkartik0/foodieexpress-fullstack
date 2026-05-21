import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';
import * as svc from './orders.service';
import type { OrderStatus } from '../../models/Order';

export const place = asyncHandler(async (req: Request, res: Response) => {
  const order = await svc.placeOrder({
    userId: req.user!.id,
    paymentMethod: req.body.paymentMethod,
    deliveryAddress: req.body.deliveryAddress,
    notes: req.body.notes,
    req,
  });
  return created(res, order.toJSON());
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.listOrders({
    userId: req.user!.id,
    role: req.user!.role,
    page: Number(req.query.page ?? 1),
    perPage: Number(req.query.perPage ?? 20),
    status: (req.query.status as OrderStatus) || undefined,
  });
  return ok(res, result.items, { meta: result.meta });
});

export const detail = asyncHandler(async (req: Request, res: Response) => {
  const order = await svc.getOrderById({
    id: req.params.id,
    userId: req.user!.id,
    role: req.user!.role,
  });
  return ok(res, order.toJSON());
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const order = await svc.updateStatus({
    id: req.params.id,
    ownerId: req.user!.id,
    isAdmin: req.user!.role === 'admin',
    next: req.body.status,
    note: req.body.note,
    req,
  });
  return ok(res, order.toJSON());
});

export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const order = await svc.cancelByCustomer({
    id: req.params.id,
    userId: req.user!.id,
    reason: req.body?.reason,
    req,
  });
  return ok(res, order.toJSON());
});
