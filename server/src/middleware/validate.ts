import { NextFunction, Request, Response } from 'express';
import Joi, { ObjectSchema } from 'joi';
import { AppError } from '../utils/AppError';

interface ValidatorMap {
  body?: ObjectSchema;
  query?: ObjectSchema;
  params?: ObjectSchema;
}

/**
 * Validate selected parts of the request against a Joi schema. Strips unknown
 * fields (default Joi behaviour with stripUnknown=true) so controllers see
 * only validated input.
 */
export function validate(schemas: ValidatorMap) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const { value, error } = schema.validate(req[key], {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });
      if (error) {
        const details = error.details.reduce<Record<string, string>>((acc, d) => {
          acc[d.path.join('.')] = d.message;
          return acc;
        }, {});
        return next(AppError.unprocessable('Validation failed', 'VALIDATION_FAILED', details));
      }
      // Reassign so downstream sees the cleaned, coerced value
      // (req.query on Express 5 may be read-only, but we use Express 4 here)
      (req as unknown as Record<string, unknown>)[key] = value;
    }
    return next();
  };
}

// Frequently used reusable schemas ----------------------------------------

export const objectIdSchema = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message('Must be a valid Mongo ObjectId');

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  perPage: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().optional(),
});
