export type Role = 'customer' | 'restaurant' | 'admin';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown> | null;
  error?: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface User {
  _id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  status: 'active' | 'locked' | 'deactivated';
  addresses?: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id?: string;
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  geo?: { lat?: number; lng?: number };
}

export interface Restaurant {
  _id: string;
  ownerId: string | { _id: string; fullName?: string; email?: string };
  name: string;
  slug: string;
  description?: string;
  cuisine: string[];
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  images: string[];
  coverImage?: string;
  costForTwo: number;
  rating: number;
  ratingCount: number;
  isApproved: boolean;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'suspended';
  openingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  _id: string;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  isVeg: boolean;
  available: boolean;
  spicyLevel?: 'mild' | 'medium' | 'hot';
  tags?: string[];
}

export interface CartItem {
  _id?: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  isVeg?: boolean;
}

export interface Cart {
  id?: string;
  restaurantId: string | null;
  items: CartItem[];
  pricing: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    total: number;
  };
}

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'stripe' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  isVeg?: boolean;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string | null;
  status: OrderStatus;
  statusHistory: Array<{ status: OrderStatus; at: string; note?: string }>;
  deliveryAddress: OrderAddress;
  notes?: string;
  cancelReason?: string;
  reviewId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  _id: string;
  userId: string;
  userName: string;
  restaurantId: string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  _id: string;
  type: string;
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  outcome: 'success' | 'failure';
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}
