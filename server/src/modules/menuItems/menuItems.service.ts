import { MenuItem, MenuItemDoc } from '../../models/MenuItem';
import { Restaurant } from '../../models/Restaurant';
import { AppError } from '../../utils/AppError';
import { audit } from '../../utils/audit';
import { Request } from 'express';

async function ensureOwnership(restaurantId: string, ownerId: string, isAdmin: boolean) {
  const restaurant = await Restaurant.findById(restaurantId);
  if (!restaurant) throw AppError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  if (!isAdmin && restaurant.ownerId.toString() !== ownerId) {
    throw AppError.forbidden('You do not own this restaurant', 'NOT_OWNER');
  }
  return restaurant;
}

export async function listMenu(args: {
  restaurantId?: string;
  category?: string;
  available?: boolean;
  q?: string;
  ownerId?: string;
  isOwnerView?: boolean;
}) {
  const filter: Record<string, unknown> = {};
  if (args.restaurantId) filter.restaurantId = args.restaurantId;
  if (args.category) filter.category = args.category;
  if (args.available !== undefined) filter.available = args.available;
  if (args.q) {
    filter.$or = [
      { name: { $regex: args.q, $options: 'i' } },
      { description: { $regex: args.q, $options: 'i' } },
      { category: { $regex: args.q, $options: 'i' } },
    ];
  }

  if (args.ownerId && args.isOwnerView) {
    const restaurant = await Restaurant.findOne({ ownerId: args.ownerId });
    filter.restaurantId = restaurant?._id ?? '___none___';
  }

  return MenuItem.find(filter).sort({ category: 1, name: 1 }).lean();
}

export async function createMenuItem(args: {
  ownerId: string;
  isAdmin: boolean;
  payload: Partial<MenuItemDoc> & { restaurantId: string };
  req?: Request;
}): Promise<MenuItemDoc> {
  await ensureOwnership(args.payload.restaurantId, args.ownerId, args.isAdmin);
  const item = await MenuItem.create(args.payload);
  await audit({
    type: 'menu.create',
    userId: args.ownerId,
    role: args.isAdmin ? 'admin' : 'restaurant',
    req: args.req,
    meta: { menuItemId: item.id, name: item.name, restaurantId: args.payload.restaurantId },
  });
  return item;
}

export async function updateMenuItem(args: {
  id: string;
  ownerId: string;
  isAdmin: boolean;
  payload: Partial<MenuItemDoc>;
  req?: Request;
}): Promise<MenuItemDoc> {
  const item = await MenuItem.findById(args.id);
  if (!item) throw AppError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');
  await ensureOwnership(item.restaurantId.toString(), args.ownerId, args.isAdmin);

  // Strip immutable fields
  const safe = { ...args.payload };
  delete (safe as Record<string, unknown>).restaurantId;

  Object.assign(item, safe);
  await item.save();
  await audit({
    type: 'menu.update',
    userId: args.ownerId,
    role: args.isAdmin ? 'admin' : 'restaurant',
    req: args.req,
    meta: { menuItemId: item.id, fields: Object.keys(safe) },
  });
  return item;
}

export async function deleteMenuItem(args: {
  id: string;
  ownerId: string;
  isAdmin: boolean;
  req?: Request;
}): Promise<void> {
  const item = await MenuItem.findById(args.id);
  if (!item) throw AppError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');
  await ensureOwnership(item.restaurantId.toString(), args.ownerId, args.isAdmin);
  await item.deleteOne();
  await audit({
    type: 'menu.delete',
    userId: args.ownerId,
    role: args.isAdmin ? 'admin' : 'restaurant',
    req: args.req,
    meta: { menuItemId: args.id, name: item.name },
  });
}
