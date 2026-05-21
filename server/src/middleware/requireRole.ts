import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { audit } from '../utils/audit';
import type { Role } from '../utils/jwt';

/**
 * Restrict a route to one or more roles. Must be mounted *after* requireAuth.
 *
 *   router.post('/menu-items', requireAuth, requireRole('restaurant'), ...)
 */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      return next(AppError.unauthorized('Authentication required', 'NO_AUTH'));
    }
    if (!allowed.includes(user.role)) {
      // Fire and forget - audit happens out of band
      void audit({
        type: 'authz.denied',
        req,
        outcome: 'failure',
        meta: { required: allowed, actual: user.role, path: req.originalUrl, method: req.method },
      });
      return next(AppError.forbidden('Insufficient privileges for this action', 'INSUFFICIENT_ROLE'));
    }
    return next();
  };
}
