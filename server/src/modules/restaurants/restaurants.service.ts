import { Restaurant, RestaurantDoc } from '../../models/Restaurant';
import { AppError } from '../../utils/AppError';
import { audit } from '../../utils/audit';
import { Request } from 'express';

interface ListRestaurantsArgs {
  q?: string;
  city?: string;
  cuisine?: string;
  minRating?: number;
  page: number;
  perPage: number;
  sort?: string;
  // Visibility filters - by default only approved + active for customers
  scope?: 'public' | 'owner' | 'admin';
  ownerId?: string;
  approvalStatus?: 'pending' | 'approved' | 'suspended' | 'all';
}

export async function listRestaurants(args: ListRestaurantsArgs) {
  const filter: Record<string, unknown> = {};

  if (args.scope === 'public') {
    filter.isApproved = true;
    filter.isActive = true;
    filter.approvalStatus = 'approved';
  } else if (args.scope === 'owner' && args.ownerId) {
    filter.ownerId = args.ownerId;
  } else if (args.scope === 'admin' && args.approvalStatus && args.approvalStatus !== 'all') {
    filter.approvalStatus = args.approvalStatus;
  }

  if (args.q) {
    filter.$or = [
      { name: { $regex: args.q, $options: 'i' } },
      { cuisine: { $regex: args.q, $options: 'i' } },
      { description: { $regex: args.q, $options: 'i' } },
    ];
  }
  if (args.city) filter['address.city'] = { $regex: `^${args.city}$`, $options: 'i' };
  if (args.cuisine) filter.cuisine = { $regex: args.cuisine, $options: 'i' };
  if (args.minRating != null) filter.rating = { $gte: args.minRating };

  let sort: Record<string, 1 | -1>;
  switch (args.sort) {
    case 'rating':
      sort = { rating: -1, ratingCount: -1 };
      break;
    case 'name':
      sort = { name: 1 };
      break;
    case 'newest':
    default:
      sort = { createdAt: -1 };
  }

  const [items, total] = await Promise.all([
    Restaurant.find(filter)
      .sort(sort)
      .skip((args.page - 1) * args.perPage)
      .limit(args.perPage)
      .lean(),
    Restaurant.countDocuments(filter),
  ]);

  return {
    items,
    meta: {
      page: args.page,
      perPage: args.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / args.perPage)),
    },
  };
}

export async function getRestaurantById(id: string, scope: 'public' | 'owner' | 'admin' = 'public'): Promise<RestaurantDoc> {
  const restaurant = await Restaurant.findById(id);
  if (!restaurant) throw AppError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  if (scope === 'public' && (!restaurant.isApproved || !restaurant.isActive)) {
    throw AppError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  }
  return restaurant;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createRestaurant(args: {
  ownerId: string;
  payload: Partial<RestaurantDoc>;
  req?: Request;
}): Promise<RestaurantDoc> {
  const baseSlug = slugify(args.payload.name ?? 'restaurant');
  let slug = baseSlug;
  let suffix = 1;
  // Ensure unique slug
  while (await Restaurant.exists({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const restaurant = await Restaurant.create({
    ...args.payload,
    slug,
    ownerId: args.ownerId,
    isApproved: false,
    approvalStatus: 'pending',
  });

  await audit({
    type: 'restaurant.create',
    userId: args.ownerId,
    role: 'restaurant',
    req: args.req,
    meta: { restaurantId: restaurant.id, name: restaurant.name },
  });

  return restaurant;
}

export async function updateRestaurant(args: {
  id: string;
  ownerId: string;
  isAdmin: boolean;
  payload: Partial<RestaurantDoc>;
  req?: Request;
}): Promise<RestaurantDoc> {
  const restaurant = await Restaurant.findById(args.id);
  if (!restaurant) throw AppError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');
  if (!args.isAdmin && restaurant.ownerId.toString() !== args.ownerId) {
    throw AppError.forbidden('You do not own this restaurant', 'NOT_OWNER');
  }

  // Prevent owners from changing approval state
  const safe: Partial<RestaurantDoc> = { ...args.payload };
  delete (safe as Record<string, unknown>).isApproved;
  delete (safe as Record<string, unknown>).approvalStatus;
  delete (safe as Record<string, unknown>).rating;
  delete (safe as Record<string, unknown>).ratingCount;
  delete (safe as Record<string, unknown>).ownerId;
  delete (safe as Record<string, unknown>).slug;

  Object.assign(restaurant, safe);
  await restaurant.save();

  await audit({
    type: 'restaurant.update',
    userId: args.ownerId,
    role: args.isAdmin ? 'admin' : 'restaurant',
    req: args.req,
    meta: { restaurantId: restaurant.id, fields: Object.keys(safe) },
  });

  return restaurant;
}

export async function getOwnedRestaurant(ownerId: string): Promise<RestaurantDoc | null> {
  return Restaurant.findOne({ ownerId });
}
