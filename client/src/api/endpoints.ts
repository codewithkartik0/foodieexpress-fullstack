import { api } from './client';
import type {
  ApiResponse,
  AuditLogEntry,
  Cart,
  MenuItem,
  NotificationItem,
  Order,
  OrderStatus,
  PageMeta,
  PaymentMethod,
  Restaurant,
  Review,
  User,
} from '../types';

// ----- Auth ------------------------------------------------------------

export const authApi = {
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: 'customer' | 'restaurant';
  }) =>
    api.post<ApiResponse<{ email: string; verificationRequired: true; otpExpiresAt: string; message: string }>>(
      '/auth/register',
      payload,
    ),

  verifyEmail: (payload: { email: string; otp: string }) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>(
      '/auth/verify-email',
      payload,
    ),

  resendOtp: (email: string) =>
    api.post<ApiResponse<{ email: string; otpExpiresAt: string }>>('/auth/resend-otp', { email }),

  login: (payload: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; accessToken: string; refreshToken: string }>>('/auth/login', payload),

  logout: (refreshToken?: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/logout', { refreshToken }),

  me: () => api.get<ApiResponse<{ user: User }>>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.put<ApiResponse<{ message: string }>>(`/auth/reset-password/${token}`, { password }),
};

// ----- Restaurants -----------------------------------------------------

export const restaurantsApi = {
  list: (params?: {
    q?: string;
    city?: string;
    cuisine?: string;
    minRating?: number;
    page?: number;
    perPage?: number;
    sort?: string;
  }) => api.get<ApiResponse<Restaurant[]> & { meta?: PageMeta }>('/restaurants', { params }),

  detail: (id: string) =>
    api.get<ApiResponse<{ restaurant: Restaurant; menu: MenuItem[]; reviews: Review[] }>>(`/restaurants/${id}`),

  myRestaurant: () => api.get<ApiResponse<Restaurant | null>>('/restaurants/me/owner'),

  create: (payload: Partial<Restaurant>) => api.post<ApiResponse<Restaurant>>('/restaurants', payload),

  update: (id: string, payload: Partial<Restaurant>) =>
    api.patch<ApiResponse<Restaurant>>(`/restaurants/${id}`, payload),
};

// ----- Menu items ------------------------------------------------------

export const menuItemsApi = {
  list: (params?: { restaurantId?: string; category?: string; available?: boolean; q?: string }) =>
    api.get<ApiResponse<MenuItem[]>>('/menu-items', { params }),

  myMenu: () => api.get<ApiResponse<MenuItem[]>>('/menu-items/me'),

  create: (payload: Partial<MenuItem> & { restaurantId: string }) =>
    api.post<ApiResponse<MenuItem>>('/menu-items', payload),

  update: (id: string, payload: Partial<MenuItem>) =>
    api.patch<ApiResponse<MenuItem>>(`/menu-items/${id}`, payload),

  remove: (id: string) => api.delete<void>(`/menu-items/${id}`),
};

// ----- Cart ------------------------------------------------------------

export const cartApi = {
  get: () => api.get<ApiResponse<Cart>>('/cart'),
  addItem: (menuItemId: string, quantity = 1) =>
    api.post<ApiResponse<Cart>>('/cart/items', { menuItemId, quantity }),
  updateItem: (id: string, quantity: number) =>
    api.patch<ApiResponse<Cart>>(`/cart/items/${id}`, { quantity }),
  removeItem: (id: string) => api.delete<ApiResponse<Cart>>(`/cart/items/${id}`),
  clear: () => api.delete<ApiResponse<Cart>>('/cart'),
};

// ----- Orders ----------------------------------------------------------

export const ordersApi = {
  place: (payload: {
    paymentMethod: PaymentMethod;
    deliveryAddress: Order['deliveryAddress'];
    notes?: string;
  }) => api.post<ApiResponse<Order>>('/orders', payload),

  list: (params?: { page?: number; perPage?: number; status?: OrderStatus }) =>
    api.get<ApiResponse<Order[]> & { meta?: PageMeta }>('/orders', { params }),

  detail: (id: string) => api.get<ApiResponse<Order>>(`/orders/${id}`),

  updateStatus: (id: string, status: OrderStatus, note?: string) =>
    api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status, note }),

  cancel: (id: string, reason?: string) =>
    api.post<ApiResponse<Order>>(`/orders/${id}/cancel`, { reason }),
};

// ----- Payments --------------------------------------------------------

export const paymentsApi = {
  createIntent: (orderId: string) =>
    api.post<ApiResponse<{ clientSecret: string; paymentId: string; stripeConfigured: boolean }>>(
      '/payments/intent',
      { orderId },
    ),

  devMarkPaid: (paymentId: string) =>
    api.post<ApiResponse<{ message: string }>>('/payments/dev/mark-paid', { paymentId }),
};

// ----- Reviews ---------------------------------------------------------

export const reviewsApi = {
  create: (payload: { orderId: string; rating: number; comment?: string }) =>
    api.post<ApiResponse<Review>>('/reviews', payload),

  listForRestaurant: (restaurantId: string, page = 1) =>
    api.get<ApiResponse<Review[]>>(`/reviews/restaurant/${restaurantId}`, { params: { page } }),
};

// ----- Notifications ---------------------------------------------------

export const notificationsApi = {
  list: (limit = 20) => api.get<ApiResponse<NotificationItem[]>>('/notifications', { params: { limit } }),
  markRead: (id: string) => api.patch<ApiResponse<NotificationItem>>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};

// ----- Admin -----------------------------------------------------------

export const adminApi = {
  listRestaurants: (params?: { status?: string; q?: string; page?: number; perPage?: number }) =>
    api.get<ApiResponse<Restaurant[]>>('/admin/restaurants', { params }),

  setApproval: (id: string, action: 'approve' | 'suspend' | 'reactivate') =>
    api.patch<ApiResponse<Restaurant>>(`/admin/restaurants/${id}/approval`, { action }),

  auditLogs: (params?: { type?: string; outcome?: string; page?: number }) =>
    api.get<ApiResponse<AuditLogEntry[]>>('/admin/audit-logs', { params }),

  platformStats: () => api.get<ApiResponse<PlatformStats>>('/admin/stats'),
};

export const restaurantAdminApi = {
  stats: () => api.get<ApiResponse<RestaurantStats>>('/restaurant-admin/stats'),
};

// ----- Stats types -----------------------------------------------------

export interface PlatformStats {
  counts: {
    users: number;
    customers: number;
    restaurantOwners: number;
    restaurants: number;
    pendingRestaurants: number;
    orders: number;
  };
  revenue: {
    total: number;
    last7Days: Array<{ _id: string; total: number; count: number }>;
  };
  recentOrders: Order[];
}

export interface RestaurantStats {
  hasRestaurant: boolean;
  restaurant?: { id: string; name: string; rating: number; ratingCount: number };
  today?: { orders: number; revenue: number };
  totals?: { orders: number; revenue: number; pendingOrders: number };
  last7Days?: Array<{ _id: string; total: number; count: number }>;
  topItems?: Array<{ _id: string; name: string; quantity: number; revenue: number }>;
  recentOrders?: Order[];
}
