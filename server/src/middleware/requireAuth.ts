import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

/**
 * Authenticate a request by validating the Bearer access token.
 * Sets req.user on success, throws AppError.unauthorized otherwise.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(AppError.unauthorized('Missing or malformed Authorization header', 'NO_TOKEN'));
  }
  const token = header.slice(7).trim();
  if (!token) {
    return next(AppError.unauthorized('Missing access token', 'NO_TOKEN'));
  }
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, role: claims.role, email: claims.email };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Optional version - if a token is present, attaches req.user; otherwise continues. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? req.header('Authorization');
  if (!header) return next();
  try {
    requireAuth(req, _res, next);
  } catch {
    return next();
  }
}
