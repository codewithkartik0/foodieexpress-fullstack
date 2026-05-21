import { Schema, model, Document, Types } from 'mongoose';

export const ORDER_STATUSES = [
  'placed',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['stripe', 'cod'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type OrderPaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface OrderItemSubdoc {
  menuItemId: Types.ObjectId;
  name: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
  isVeg?: boolean;
}

export interface OrderAddressSubdoc {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: Date;
  by?: Types.ObjectId;
  note?: string;
}

export interface OrderDoc extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  restaurantId: Types.ObjectId;
  items: OrderItemSubdoc[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  paymentId?: Types.ObjectId | null;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  deliveryAddress: OrderAddressSubdoc;
  notes?: string;
  cancelReason?: string;
  reviewId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<OrderItemSubdoc>(
  {
    menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    imageUrl: { type: String },
    isVeg: { type: Boolean },
  },
  { _id: false },
);

const addressSchema = new Schema<OrderAddressSubdoc>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'IN' },
  },
  { _id: false },
);

const statusEventSchema = new Schema<OrderStatusEvent>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: () => new Date(), required: true },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    items: { type: [orderItemSchema], required: true, validate: (a: unknown[]) => a.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: { type: String, enum: ORDER_STATUSES, default: 'placed', required: true, index: true },
    statusHistory: { type: [statusEventSchema], default: [] },
    deliveryAddress: { type: addressSchema, required: true },
    notes: { type: String, trim: true, maxlength: 500 },
    cancelReason: { type: String, trim: true, maxlength: 500 },
    reviewId: { type: Schema.Types.ObjectId, ref: 'Review', default: null },
  },
  { timestamps: true, strict: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });

// Allowed status transitions for the lifecycle. The same map is used in the service.
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const Order = model<OrderDoc>('Order', orderSchema);
