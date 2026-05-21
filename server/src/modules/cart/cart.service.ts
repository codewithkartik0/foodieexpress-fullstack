import { Types } from 'mongoose';
import { Cart, CartDoc } from '../../models/Cart';
import { MenuItem } from '../../models/MenuItem';
import { Restaurant } from '../../models/Restaurant';
import { AppError } from '../../utils/AppError';
import { computePricing } from '../../utils/pricing';

async function loadOrCreateCart(userId: string): Promise<CartDoc> {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [], restaurantId: null });
  }
  return cart;
}

function projectCart(cart: CartDoc) {
  const pricing = computePricing(cart.items.map((i) => ({ unitPrice: i.unitPrice, quantity: i.quantity })));
  return {
    id: cart.id,
    restaurantId: cart.restaurantId,
    items: cart.items,
    pricing,
  };
}

export async function getCart(userId: string) {
  const cart = await loadOrCreateCart(userId);
  return projectCart(cart);
}

export async function addItem(args: { userId: string; menuItemId: string; quantity?: number }) {
  const quantity = args.quantity ?? 1;
  if (quantity < 1) throw AppError.badRequest('Quantity must be >= 1', 'BAD_QUANTITY');

  const menuItem = await MenuItem.findById(args.menuItemId);
  if (!menuItem) throw AppError.notFound('Menu item not found', 'MENU_ITEM_NOT_FOUND');
  if (!menuItem.available) throw AppError.badRequest('Item not available', 'ITEM_UNAVAILABLE');

  const restaurant = await Restaurant.findById(menuItem.restaurantId);
  if (!restaurant || !restaurant.isApproved || !restaurant.isActive) {
    throw AppError.badRequest('Restaurant not available', 'RESTAURANT_UNAVAILABLE');
  }

  const cart = await loadOrCreateCart(args.userId);

  // If cart has items from a different restaurant, refuse
  if (cart.restaurantId && cart.restaurantId.toString() !== menuItem.restaurantId.toString()) {
    throw AppError.conflict(
      'Your cart contains items from another restaurant. Clear it before adding from a different one.',
      'CART_RESTAURANT_MISMATCH',
    );
  }

  if (!cart.restaurantId) cart.restaurantId = menuItem.restaurantId;

  const existing = cart.items.find((i) => i.menuItemId.toString() === args.menuItemId);
  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    cart.items.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity,
      imageUrl: menuItem.imageUrl,
      isVeg: menuItem.isVeg,
    });
  }

  await cart.save();
  return projectCart(cart);
}

export async function updateItem(args: { userId: string; itemId: string; quantity: number }) {
  const cart = await loadOrCreateCart(args.userId);
  const item = cart.items.find((i) => (i._id as Types.ObjectId).toString() === args.itemId);
  if (!item) throw AppError.notFound('Cart item not found', 'CART_ITEM_NOT_FOUND');

  if (args.quantity <= 0) {
    cart.items = cart.items.filter((i) => (i._id as Types.ObjectId).toString() !== args.itemId);
  } else {
    item.quantity = Math.min(99, args.quantity);
  }

  if (cart.items.length === 0) cart.restaurantId = null;
  await cart.save();
  return projectCart(cart);
}

export async function removeItem(args: { userId: string; itemId: string }) {
  const cart = await loadOrCreateCart(args.userId);
  cart.items = cart.items.filter((i) => (i._id as Types.ObjectId).toString() !== args.itemId);
  if (cart.items.length === 0) cart.restaurantId = null;
  await cart.save();
  return projectCart(cart);
}

export async function clearCart(userId: string) {
  const cart = await loadOrCreateCart(userId);
  cart.items = [];
  cart.restaurantId = null;
  await cart.save();
  return projectCart(cart);
}
