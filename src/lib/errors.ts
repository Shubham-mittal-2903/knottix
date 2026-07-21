export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'INTERNAL'
  | 'BAD_REQUEST'
  | 'SERVICE_UNAVAILABLE';

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  BAD_REQUEST: 400,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = HTTP_STATUS[code];
    this.context = context;
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'Insufficient permissions'): AppError {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(entity: string, id?: string): AppError {
    const msg = id ? `${entity} not found: ${id}` : `${entity} not found`;
    return new AppError('NOT_FOUND', msg, { entity, id });
  }

  static conflict(message: string): AppError {
    return new AppError('CONFLICT', message);
  }

  static validation(message: string, context?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION', message, context);
  }

  static badRequest(message: string): AppError {
    return new AppError('BAD_REQUEST', message);
  }

  static internal(message = 'An unexpected error occurred'): AppError {
    return new AppError('INTERNAL', message);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}
