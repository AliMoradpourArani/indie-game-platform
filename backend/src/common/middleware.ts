import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import { AppError } from './errors.js';
import { logger } from './logger.js';

export function requestId(req: Request, _res: Response, next: NextFunction): void {
  (req as Request & { requestId?: string }).requestId = randomUUID();
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        requestId: (req as { requestId?: string }).requestId,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - start,
      },
      'request completed',
    );
  });
  next();
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

// Central error mapper: domain errors → HTTP. Must be registered last.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
    });
    return;
  }
  logger.error({ err, requestId: (req as { requestId?: string }).requestId }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
