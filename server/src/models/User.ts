import { Schema, model, Document, Types } from 'mongoose';

export const ROLES = ['customer', 'restaurant', 'admin'] as const;
export type UserRole = (typeof ROLES)[number];

export const USER_STATUSES = ['active', 'locked', 'deactivated'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface AddressSubdoc {
  _id?: Types.ObjectId;
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

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  addresses: AddressSubdoc[];
  status: UserStatus;
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  emailVerified: boolean;
  emailVerificationOtpHash?: string | null;
  emailVerificationExpiresAt?: Date | null;
  emailVerificationAttempts: number;
  emailVerificationSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<AddressSubdoc>(
  {
    label: { type: String, trim: true, maxlength: 40 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, required: true, trim: true, default: 'IN', maxlength: 60 },
    isDefault: { type: Boolean, default: false },
    geo: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
  },
  { _id: true },
);

const userSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    phone: { type: String, trim: true, match: [/^[0-9]{10}$/, 'Phone must be 10 digits'] },
    role: { type: String, enum: ROLES, default: 'customer', required: true, index: true },
    addresses: { type: [addressSchema], default: [] },
    status: { type: String, enum: USER_STATUSES, default: 'active', required: true },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    emailVerified: { type: Boolean, default: false, required: true, index: true },
    emailVerificationOtpHash: { type: String, default: null, select: false },
    emailVerificationExpiresAt: { type: Date, default: null, select: false },
    emailVerificationAttempts: { type: Number, default: 0 },
    emailVerificationSentAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as Record<string, unknown>).passwordHash;
        delete (ret as Record<string, unknown>).passwordResetTokenHash;
        delete (ret as Record<string, unknown>).passwordResetExpiresAt;
        delete (ret as Record<string, unknown>).emailVerificationOtpHash;
        delete (ret as Record<string, unknown>).emailVerificationExpiresAt;
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  },
);

export const User = model<UserDoc>('User', userSchema);
