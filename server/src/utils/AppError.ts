/**
 * AppError — structured error type with stable error code, HTTP status, and optional details.
 * The global error handler converts these into consistent JSON responses.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(message: string, status = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return new AppError(message, 400, code, details);
  }
  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }
  static notFound(message = 'Not Found', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }
  static locked(message = 'Resource locked', code = 'LOCKED') {
    return new AppError(message, 423, code);
  }
  static unprocessable(message: string, code = 'UNPROCESSABLE_ENTITY', details?: unknown) {
    return new AppError(message, 422, code, details);
  }
  static tooMany(message = 'Too many requests', code = 'TOO_MANY_REQUESTS') {
    return new AppError(message, 429, code);
  }
}
