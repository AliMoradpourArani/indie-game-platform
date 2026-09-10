// Domain errors carry a machine-readable code; the HTTP layer maps them once.
export class AppError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const Errors = {
  unauthorized: (msg = 'Authentication required') => new AppError('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Not allowed') => new AppError('FORBIDDEN', msg, 403),
  notFound: (msg = 'Not found') => new AppError('NOT_FOUND', msg, 404),
  conflict: (msg = 'Conflict') => new AppError('CONFLICT', msg, 409),
  validation: (msg = 'Invalid input') => new AppError('VALIDATION_ERROR', msg, 422),
  illegalTransition: (from: string, to: string) =>
    new AppError('ILLEGAL_TRANSITION', `Cannot transition submission from ${from} to ${to}`, 422),
  paymentRequired: (msg = 'Payment required') => new AppError('PAYMENT_REQUIRED', msg, 402),
} as const;
