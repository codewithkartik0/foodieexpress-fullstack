import { Review, ReviewDoc } from '../../models/Review';
import { Order } from '../../models/Order';
import { Restaurant } from '../../models/Restaurant';
import { User } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { audit } from '../../utils/audit';
import { Request } from 'express';

export async function createReview(args: {
  userId: string;
  orderId: string;
  rating: number;
  comment?: string;
  req?: Request;
}): Promise<ReviewDoc> {
  const order = await Order.findById(args.orderId);
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  if (order.userId.toString() !== args.userId) {
    throw AppError.forbidden('You can only review your own orders', 'NOT_ORDER_OWNER');
  }
  if (order.status !== 'delivered') {
    throw AppError.badRequest('You can only review delivered orders', 'NOT_DELIVERED');
  }
  if (order.reviewId) {
    throw AppError.conflict('A review for this order already exists', 'REVIEW_EXISTS');
  }

  const user = await User.findById(args.userId);
  if (!user) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  const review = await Review.create({
    userId: args.userId,
    userName: user.fullName,
    restaurantId: order.restaurantId,
    orderId: order._id,
    rating: args.rating,
    comment: args.comment,
  });

  order.reviewId = review._id;
  await order.save();

  // Recompute restaurant rating
  const restaurant = await Restaurant.findById(order.restaurantId);
  if (restaurant) {
    const newCount = restaurant.ratingCount + 1;
    const newAvg = (restaurant.rating * restaurant.ratingCount + args.rating) / newCount;
    restaurant.rating = +newAvg.toFixed(2);
    restaurant.ratingCount = newCount;
    await restaurant.save();
  }

  await audit({
    type: 'review.create',
    userId: args.userId,
    role: 'customer',
    req: args.req,
    meta: { reviewId: review.id, orderId: order.id, rating: args.rating },
  });

  return review;
}

export async function listForRestaurant(restaurantId: string, page: number, perPage: number) {
  const [items, total] = await Promise.all([
    Review.find({ restaurantId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean(),
    Review.countDocuments({ restaurantId }),
  ]);
  return {
    items,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  };
}
