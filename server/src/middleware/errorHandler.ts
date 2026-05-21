import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { config } from '../config';

interface ErrorBody {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

function toErrorBody(err: unknown): ErrorBody {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message, details: err.details };
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details: Record<string, string> = {};
    for (const [k, v] of Object.entries(err.errors)) details[k] = v.message;
    return { status: 422, code: 'VALIDATION_FAILED', message: 'Validation failed', details };
  }
  if (err instanceof mongoose.Error.CastError) {
    return { status: 400, code: 'INVALID_ID', message: `Invalid ${err.path}: ${err.value}` };
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
    const e = err as { keyValue?: Record<string, unknown> };
    return {
      status: 409,
      code: 'DUPLICATE_KEY',
      message: 'Resource already exists',
      details: e.keyValue,
    };
  }
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong' };
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

// Express requires the four-argument signature for error-handling middleware
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const body = toErrorBody(err);

  if (body.status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${body.status}`, err as Error);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${body.status} ${body.code}: ${body.message}`);
  }

  res.status(body.status).json({
    data: null,
    meta: null,
    error: {
      code: body.code,
      message: body.message,
      details: body.details ?? null,
      ...(config.isProd ? {} : { stack: (err as Error)?.stack }),
    },
  });
};
