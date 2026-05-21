import rateLimit from 'express-rate-limit';
import { config } from '../config';

/** Generic per-IP rate limiter applied to all API routes. */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: {
    data: null,
    meta: null,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests, please slow down.' },
  },
});

/** Stricter rate limiter for sensitive auth endpoints. */
export const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: {
    data: null,
    meta: null,
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts, try again later.' },
  },
});
