import { Router } from 'express';
import type { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../infrastructure/db.js';
import { requireAdmin, requireAuth, type AuthRequest } from '../auth/middleware.js';
import { createDiscount, listComments, listDiscounts, postComment, rateGame, ratingSummary, validateDiscount } from './service.js';

function deps() {
  return { db: prisma };
}

export function feedbackRouter(): Router {
  const router = Router();

  router.get('/games/:id/comments', async (req, res: Response, next) => {
    try {
      res.json(await listComments(deps(), req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/games/:id/comments', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ body: z.string().min(1).max(2000) }).parse(req.body);
      res.status(201).json(await postComment(deps(), req.params.id, req.auth!.sub, body.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/games/:id/ratings', async (req, res: Response, next) => {
    try {
      res.json(await ratingSummary(deps(), req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/games/:id/ratings', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ stars: z.number().int().min(1).max(5) }).parse(req.body);
      res.status(201).json(await rateGame(deps(), req.params.id, req.auth!.sub, body.stars));
    } catch (err) {
      next(err);
    }
  });

  router.post('/discounts/validate', async (req, res: Response, next) => {
    try {
      const body = z.object({ code: z.string().min(1).max(32) }).parse(req.body);
      const found = await validateDiscount(deps(), body.code);
      res.json(found ?? { active: false });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/discounts', requireAuth, requireAdmin, async (_req, res: Response, next) => {
    try {
      res.json(await listDiscounts(deps()));
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/discounts', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ code: z.string().min(3).max(32), percentOff: z.number().int().min(1).max(90) }).parse(req.body);
      res.status(201).json(await createDiscount(deps(), body.code, body.percentOff));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
