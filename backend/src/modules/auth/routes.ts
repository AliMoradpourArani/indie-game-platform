import { Router } from 'express';
import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { loadConfig } from '../../config/env.js';
import { prisma } from '../../infrastructure/db.js';
import { requireAuth, type AuthRequest } from './middleware.js';
import { getMe, loginUser, registerUser } from './service.js';
import { loginSchema, registerSchema } from './validation.js';

const strictAuthLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60, // brute-force protection on credential endpoints
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function deps() {
  const config = loadConfig();
  return { db: prisma, jwtSecret: config.JWT_SECRET, jwtExpiresIn: config.JWT_EXPIRES_IN };
}

export function authRouter(): Router {
  const router = Router();

  router.post('/auth/register', strictAuthLimit, async (req: Request, res: Response, next) => {
    try {
      const input = registerSchema.parse(req.body);
      const result = await registerUser(deps(), input);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/auth/login', strictAuthLimit, async (req: Request, res: Response, next) => {
    try {
      const input = loginSchema.parse(req.body);
      const result = await loginUser(deps(), input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Stateless JWT: logout is client-side (drop the token). Endpoint exists so the
  // contract is stable when refresh-token rotation lands (Phase 8/9).
  router.post('/auth/logout', requireAuth, (_req: AuthRequest, res: Response) => {
    res.json({ ok: true });
  });

  router.get('/auth/me', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await getMe(deps(), req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
