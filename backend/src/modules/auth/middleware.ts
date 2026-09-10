import type { NextFunction, Request, Response } from 'express';
import { Errors } from '../../common/errors.js';
import { loadConfig } from '../../config/env.js';
import { verifyToken, type TokenPayload } from './tokens.js';

export interface AuthRequest extends Request {
  auth?: TokenPayload;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/** Backend-enforced authentication. Never rely on frontend role checks. */
export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const token = bearerToken(req);
    if (!token) throw Errors.unauthorized();
    req.auth = verifyToken(token, loadConfig().JWT_SECRET);
    next();
  } catch (err) {
    next(err instanceof Error && 'status' in err ? err : Errors.unauthorized('Invalid or expired token'));
  }
}

export function requireRole(...roles: TokenPayload['role'][]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(Errors.unauthorized());
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(Errors.forbidden('Insufficient permissions'));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('ADMIN');
export const requireDeveloper = requireRole('DEVELOPER', 'ADMIN');
