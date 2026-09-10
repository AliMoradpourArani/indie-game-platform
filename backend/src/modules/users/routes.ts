import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../../infrastructure/db.js';
import { requireAuth, type AuthRequest } from '../auth/middleware.js';
import { getMe } from '../auth/service.js';

export function usersRouter(): Router {
  const router = Router();

  router.get('/users/me', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await getMe({ db: prisma }, req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
