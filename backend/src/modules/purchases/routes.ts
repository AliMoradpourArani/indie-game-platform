import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/db.js';
import { requireAuth, type AuthRequest } from '../auth/middleware.js';
import { checkout, confirmPurchase, myLibrary } from './service.js';

export function purchasesRouter(): Router {
  const router = Router();

  router.post('/purchases/checkout', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ gameId: z.string().min(1) }).parse(req.body);
      const key = req.headers['idempotency-key'];
      if (typeof key !== 'string' || key.length < 8) {
        res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Idempotency-Key header is required' } });
        return;
      }
      const result = await checkout({ db: prisma }, req.auth!.sub, body.gameId, key);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/purchases/confirm', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ checkoutId: z.string().min(1) }).parse(req.body);
      res.json(await confirmPurchase({ db: prisma }, req.auth!.sub, body.checkoutId));
    } catch (err) {
      next(err);
    }
  });

  router.get('/library', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await myLibrary(prisma, req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
