import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { startOfDay, subDays } from '../../utils/dateHelpers';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import { requireAuth } from '../../middleware/requireAuth';
import { requireRole } from '../../middleware/requireRole';
import { validate } from '../../middleware/validate';
import { Restaurant } from '../../models/Restaurant';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { AuditLog, AUDIT_EVENT_TYPES } from '../../models/AuditLog';
import { audit } from '../../utils/audit';
import { AppError } from '../../utils/AppError';

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

// ----- Restaurants admin endpoints ---------------------------------------

const listRestaurantsQuery = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'suspended', 'all').default('all'),
  q: Joi.string().max(120).optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(50).default(20),
});

const approvalSchema = Joi.object({
  action: Joi.string().valid('approve', 'suspend', 'reactivate').required(),
});

const listRestaurants = asyncHandler(async (req: Request, res: Response) => {
  const { status, q, page, perPage } = req.query as unknown as {
    status: 'pending' | 'approved' | 'suspended' | 'all';
    q?: string;
    page: number;
    perPage: number;
  };
  const filter: Record<string, unknown> = {};
  if (status !== 'all') filter.approvalStatus = status;
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { 'address.city': { $regex: q, $options: 'i' } }];

  const [items, total] = await Promise.all([
    Restaurant.find(filter)
      .populate('ownerId', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Restaurant.countDocuments(filter),
  ]);
  return ok(res, items, { meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) } });
});

const setApproval = asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body as { action: 'approve' | 'suspend' | 'reactivate' };
  const restaurant = await Restaurant.findById(req.params.id);
  if (!restaurant) throw AppError.notFound('Restaurant not found', 'RESTAURANT_NOT_FOUND');

  switch (action) {
    case 'approve':
      restaurant.isApproved = true;
      restaurant.isActive = true;
      restaurant.approvalStatus = 'approved';
      break;
    case 'suspend':
      restaurant.isActive = false;
      restaurant.approvalStatus = 'suspended';
      break;
    case 'reactivate':
      restaurant.isActive = true;
      restaurant.approvalStatus = 'approved';
      restaurant.isApproved = true;
      break;
  }
  await restaurant.save();

  await audit({
    type: action === 'suspend' ? 'restaurant.suspend' : 'restaurant.approve',
    userId: req.user!.id,
    role: 'admin',
    req,
    meta: { restaurantId: restaurant.id, action },
  });

  return ok(res, restaurant.toJSON());
});

// ----- Audit logs --------------------------------------------------------

const auditLogsQuery = Joi.object({
  type: Joi.string()
    .valid(...AUDIT_EVENT_TYPES)
    .optional(),
  outcome: Joi.string().valid('success', 'failure').optional(),
  userId: objectId.optional(),
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(50),
});

const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { type, outcome, userId, page, perPage } = req.query as unknown as {
    type?: string;
    outcome?: string;
    userId?: string;
    page: number;
    perPage: number;
  };
  const filter: Record<string, unknown> = {};
  if (type) filter.type = type;
  if (outcome) filter.outcome = outcome;
  if (userId) filter.userId = userId;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, items, { meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) } });
});

// ----- Platform stats ----------------------------------------------------

const platformStats = asyncHandler(async (_req: Request, res: Response) => {
  const since = subDays(new Date(), 7);
  const [
    userCount,
    customerCount,
    restaurantOwnerCount,
    restaurantCount,
    pendingRestaurantCount,
    orderCount,
    paidRevenueAgg,
    last7DaysRevenueAgg,
    recentOrders,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'restaurant' }),
    Restaurant.countDocuments({}),
    Restaurant.countDocuments({ approvalStatus: 'pending' }),
    Order.countDocuments({}),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.find({}).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return ok(res, {
    counts: {
      users: userCount,
      customers: customerCount,
      restaurantOwners: restaurantOwnerCount,
      restaurants: restaurantCount,
      pendingRestaurants: pendingRestaurantCount,
      orders: orderCount,
    },
    revenue: {
      total: paidRevenueAgg[0]?.total ?? 0,
      last7Days: last7DaysRevenueAgg,
    },
    recentOrders,
  });
});

// ----- Restaurant owner dashboard stats ----------------------------------

const ownerStats = asyncHandler(async (req: Request, res: Response) => {
  const restaurant = await Restaurant.findOne({ ownerId: req.user!.id });
  if (!restaurant) {
    return ok(res, {
      hasRestaurant: false,
    });
  }
  const since = subDays(new Date(), 7);
  const todayStart = startOfDay(new Date());

  const [
    todayOrders,
    todayRevenueAgg,
    totalOrders,
    totalRevenueAgg,
    pendingOrders,
    last7DaysAgg,
    topItemsAgg,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ restaurantId: restaurant._id, createdAt: { $gte: todayStart } }),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, paymentStatus: 'paid', createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({ restaurantId: restaurant._id }),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.countDocuments({
      restaurantId: restaurant._id,
      status: { $in: ['placed', 'accepted', 'preparing', 'out_for_delivery'] },
    }),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id, paymentStatus: 'paid', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { restaurantId: restaurant._id } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          quantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Order.find({ restaurantId: restaurant._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  return ok(res, {
    hasRestaurant: true,
    restaurant: { id: restaurant.id, name: restaurant.name, rating: restaurant.rating, ratingCount: restaurant.ratingCount },
    today: {
      orders: todayOrders,
      revenue: todayRevenueAgg[0]?.total ?? 0,
    },
    totals: {
      orders: totalOrders,
      revenue: totalRevenueAgg[0]?.total ?? 0,
      pendingOrders,
    },
    last7Days: last7DaysAgg,
    topItems: topItemsAgg,
    recentOrders,
  });
});

// ----- Router ------------------------------------------------------------

const router = Router();

router.use(requireAuth);

router.get(
  '/admin/restaurants',
  requireRole('admin'),
  validate({ query: listRestaurantsQuery }),
  listRestaurants,
);
router.patch(
  '/admin/restaurants/:id/approval',
  requireRole('admin'),
  validate({ params: Joi.object({ id: objectId.required() }), body: approvalSchema }),
  setApproval,
);
router.get(
  '/admin/audit-logs',
  requireRole('admin'),
  validate({ query: auditLogsQuery }),
  listAuditLogs,
);
router.get('/admin/stats', requireRole('admin'), platformStats);

router.get('/restaurant-admin/stats', requireRole('restaurant'), ownerStats);

export default router;
