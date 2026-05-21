import { customAlphabet } from 'nanoid';
import { Cart } from '../../models/Cart';
import { Order, OrderDoc, OrderStatus, ALLOWED_TRANSITIONS, PaymentMethod } from '../../models/Order';
import { Restaurant } from '../../models/Restaurant';
import { MenuItem } from '../../models/MenuItem';
import { AppError } from '../../utils/AppError';
import { audit } from '../../utils/audit';
import { computePricing } from '../../utils/pricing';
import { Notification } from '../../models/Notification';
import { Request } from 'express';

const orderNumberAlphabet = '0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ';
const orderNumberGen = customAlphabet(orderNumberAlphabet, 8);

interface PlaceOrderArgs {
  userId: string;
  paymentMethod: PaymentMethod;
  deliveryAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  };
  notes?: string;
  req?: Request;
}

export async function placeOrder(args: PlaceOrderArgs): Promise<OrderDoc> {
  const cart = await Cart.findOne({ userId: args.userId });
  if (!cart || cart.items.length === 0 || !cart.restaurantId) {
    throw AppError.badRequest('Cart is empty', 'EMPTY_CART');
  }

  const restaurant = await Restaurant.findById(cart.restaurantId);
  if (!restaurant || !restaurant.isApproved || !restaurant.isActive) {
    throw AppError.badRequest('Restaurant not available', 'RESTAURANT_UNAVAILABLE');
  }

  // Re-fetch menu items for current pricing/availability snapshot
  const itemIds = cart.items.map((i) => i.menuItemId);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds } });
  const menuById = new Map(menuItems.map((m) => [m._id.toString(), m]));

  const orderItems = cart.items.map((line) => {
    const m = menuById.get(line.menuItemId.toString());
    if (!m || !m.available) {
      throw AppError.badRequest(`"${line.name}" is no longer available`, 'ITEM_UNAVAILABLE');
    }
    return {
      menuItemId: m._id,
      name: m.name,
      unitPrice: m.price,
      quantity: line.quantity,
      imageUrl: m.imageUrl,
      isVeg: m.isVeg,
    };
  });

  const pricing = computePricing(orderItems);

  const order = await Order.create({
    orderNumber: orderNumberGen(),
    userId: args.userId,
    restaurantId: restaurant._id,
    items: orderItems,
    subtotal: pricing.subtotal,
    tax: pricing.tax,
    deliveryFee: pricing.deliveryFee,
    total: pricing.total,
    paymentMethod: args.paymentMethod,
    paymentStatus: args.paymentMethod === 'cod' ? 'pending' : 'pending',
    status: 'placed',
    statusHistory: [{ status: 'placed', at: new Date(), by: args.userId as unknown as undefined }],
    deliveryAddress: { ...args.deliveryAddress, country: args.deliveryAddress.country ?? 'IN' },
    notes: args.notes,
  });

  // Clear cart immediately
  cart.items = [];
  cart.restaurantId = null;
  await cart.save();

  // Notification for restaurant owner
  await Notification.create({
    userId: restaurant.ownerId,
    type: 'order.placed',
    title: `New order #${order.orderNumber}`,
    body: `${orderItems.length} item(s) – ₹${pricing.total.toFixed(2)}`,
    link: `/admin/orders/${order.id}`,
  });

  await audit({
    type: 'order.create',
    userId: args.userId,
    role: 'customer',
    req: args.req,
    meta: { orderId: order.id, restaurantId: restaurant.id, total: pricing.total },
  });

  return order;
}

export async function listOrders(args: {
  userId: string;
  role: 'customer' | 'restaurant' | 'admin';
  page: number;
  perPage: number;
  status?: OrderStatus;
}) {
  const filter: Record<string, unknown> = {};
  if (args.role === 'customer') {
    filter.userId = args.userId;
  } else if (args.role === 'restaurant') {
    const restaurant = await Restaurant.findOne({ ownerId: args.userId });
    if (!restaurant) return { items: [], meta: { page: 1, perPage: args.perPage, total: 0, totalPages: 1 } };
    filter.restaurantId = restaurant._id;
  }
  if (args.status) filter.status = args.status;

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((args.page - 1) * args.perPage)
      .limit(args.perPage)
      .lean(),
    Order.countDocuments(filter),
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

export async function getOrderById(args: {
  id: string;
  userId: string;
  role: 'customer' | 'restaurant' | 'admin';
}): Promise<OrderDoc> {
  const order = await Order.findById(args.id);
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');

  const isOwner =
    args.role === 'admin' ||
    (args.role === 'customer' && order.userId.toString() === args.userId);

  let isRestaurant = false;
  if (args.role === 'restaurant') {
    const restaurant = await Restaurant.findOne({ _id: order.restaurantId, ownerId: args.userId });
    isRestaurant = !!restaurant;
  }

  if (!isOwner && !isRestaurant) {
    // Don't leak existence - return 404
    throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }
  return order;
}

export async function updateStatus(args: {
  id: string;
  ownerId: string;
  isAdmin: boolean;
  next: OrderStatus;
  note?: string;
  req?: Request;
}): Promise<OrderDoc> {
  const order = await Order.findById(args.id);
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');

  if (!args.isAdmin) {
    const restaurant = await Restaurant.findOne({ _id: order.restaurantId, ownerId: args.ownerId });
    if (!restaurant) throw AppError.forbidden('Not your order', 'NOT_ORDER_OWNER');
  }

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed.includes(args.next)) {
    throw AppError.badRequest(
      `Cannot transition from ${order.status} to ${args.next}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  order.status = args.next;
  order.statusHistory.push({
    status: args.next,
    at: new Date(),
    by: args.ownerId as unknown as undefined,
    note: args.note,
  });

  // For COD orders, mark as paid on delivery
  if (args.next === 'delivered' && order.paymentMethod === 'cod') {
    order.paymentStatus = 'paid';
  }

  await order.save();

  // Notify customer
  await Notification.create({
    userId: order.userId,
    type: `order.${args.next}`,
    title: `Order #${order.orderNumber}: ${args.next.replace(/_/g, ' ')}`,
    body: args.note ?? `Your order is now ${args.next.replace(/_/g, ' ')}.`,
    link: `/orders/${order.id}`,
  });

  await audit({
    type: 'order.status.update',
    userId: args.ownerId,
    role: args.isAdmin ? 'admin' : 'restaurant',
    req: args.req,
    meta: { orderId: order.id, from: order.statusHistory.at(-2)?.status, to: args.next },
  });

  return order;
}

export async function cancelByCustomer(args: {
  id: string;
  userId: string;
  reason?: string;
  req?: Request;
}): Promise<OrderDoc> {
  const order = await Order.findById(args.id);
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.userId.toString() !== args.userId) {
    throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  }
  if (!['placed', 'accepted'].includes(order.status)) {
    throw AppError.badRequest('Order can no longer be cancelled', 'NOT_CANCELLABLE');
  }

  order.status = 'cancelled';
  order.cancelReason = args.reason;
  order.statusHistory.push({
    status: 'cancelled',
    at: new Date(),
    by: args.userId as unknown as undefined,
    note: args.reason,
  });
  if (order.paymentStatus === 'paid') {
    // Mark for refund (handled out of band by admin)
    order.paymentStatus = 'refunded';
  }
  await order.save();

  await audit({
    type: 'order.cancel',
    userId: args.userId,
    role: 'customer',
    req: args.req,
    meta: { orderId: order.id, reason: args.reason },
  });

  return order;
}
