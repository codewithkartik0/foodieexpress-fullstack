import { Request } from 'express';
import { AuditLog, AuditEventType } from '../models/AuditLog';
import { logger } from '../config/logger';

export interface AuditWriteArgs {
  type: AuditEventType;
  req?: Request;
  userId?: string | null;
  role?: string | null;
  meta?: Record<string, unknown>;
  outcome?: 'success' | 'failure';
}

/**
 * Append a structured entry to the audit log. Failures are swallowed so an
 * audit-write outage cannot break the user-facing request.
 */
export async function audit(args: AuditWriteArgs): Promise<void> {
  try {
    await AuditLog.create({
      type: args.type,
      userId: args.userId ?? args.req?.user?.id ?? null,
      role: args.role ?? args.req?.user?.role ?? null,
      ip: args.req?.ip ?? null,
      userAgent: args.req?.get('user-agent') ?? null,
      outcome: args.outcome ?? 'success',
      meta: args.meta ?? {},
    });
  } catch (err) {
    logger.warn('audit write failed', err as Error);
  }
}
