import { Schema, model, Document, Types } from 'mongoose';

export interface OpeningHour {
  open: string; // HH:mm
  close: string; // HH:mm
  closed?: boolean;
}

export interface RestaurantDoc extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
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
    geo?: { lat?: number; lng?: number };
  };
  openingHours: {
    mon: OpeningHour;
    tue: OpeningHour;
    wed: OpeningHour;
    thu: OpeningHour;
    fri: OpeningHour;
    sat: OpeningHour;
    sun: OpeningHour;
  };
  images: string[];
  coverImage?: string;
  costForTwo: number;
  rating: number;
  ratingCount: number;
  isApproved: boolean;
  isActive: boolean;
  approvalStatus: 'pending' | 'approved' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const hourSchema = new Schema<OpeningHour>(
  {
    open: { type: String, default: '10:00' },
    close: { type: String, default: '22:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const restaurantSchema = new Schema<RestaurantDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 500 },
    cuisine: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: 'At most 10 cuisines',
      },
    },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true, index: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, default: 'IN' },
      geo: {
        lat: { type: Number, min: -90, max: 90 },
        lng: { type: Number, min: -180, max: 180 },
      },
    },
    openingHours: {
      mon: { type: hourSchema, default: () => ({}) },
      tue: { type: hourSchema, default: () => ({}) },
      wed: { type: hourSchema, default: () => ({}) },
      thu: { type: hourSchema, default: () => ({}) },
      fri: { type: hourSchema, default: () => ({}) },
      sat: { type: hourSchema, default: () => ({}) },
      sun: { type: hourSchema, default: () => ({}) },
    },
    images: { type: [String], default: [] },
    coverImage: { type: String },
    costForTwo: { type: Number, default: 400, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isApproved: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'suspended'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true, strict: true },
);

restaurantSchema.index({ name: 'text', cuisine: 'text', description: 'text' });
restaurantSchema.index({ 'address.city': 1, isApproved: 1, isActive: 1 });

export const Restaurant = model<RestaurantDoc>('Restaurant', restaurantSchema);
