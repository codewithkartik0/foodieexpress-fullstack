import { Schema, model, Document, Types } from 'mongoose';

export const AUDIT_EVENT_TYPES = [
  'auth.register',
  'auth.login.success',
  'auth.login.failure',
  'auth.login.locked',
  'auth.logout',
  'auth.refresh',
  'auth.password.reset.request',
  'auth.password.reset.complete',
  'auth.email.verify.success',
  'auth.email.verify.failure',
  'auth.email.otp.resend',
  'authz.denied',
  'restaurant.create',
  'restaurant.update',
  'restaurant.approve',
  'restaurant.suspend',
  'menu.create',
  'menu.update',
  'menu.delete',
  'order.create',
  'order.status.update',
  'order.cancel',
  'payment.intent.create',
  'payment.succeeded',
  'payment.failed',
  'payment.refund',
  'review.create',
  'admin.action',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export interface AuditLogDoc extends Document {
  _id: Types.ObjectId;
  type: AuditEventType;
  userId?: Types.ObjectId | null;
  role?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  outcome: 'success' | 'failure';
  meta: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    type: { type: String, enum: AUDIT_EVENT_TYPES, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: { type: String, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    outcome: { type: String, enum: ['success', 'failure'], default: 'success', required: true },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    strict: true,
    // No update/delete API – append-only by convention; protected at the route layer.
  },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<AuditLogDoc>('AuditLog', auditLogSchema);
