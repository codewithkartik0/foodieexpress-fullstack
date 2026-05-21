import { Response } from 'express';

interface SuccessOptions {
  status?: number;
  meta?: Record<string, unknown>;
}

export function ok<T>(res: Response, data: T, opts: SuccessOptions = {}): Response {
  return res.status(opts.status ?? 200).json({
    data,
    meta: opts.meta ?? null,
    error: null,
  });
}

export function created<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  return ok(res, data, { status: 201, meta });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}
