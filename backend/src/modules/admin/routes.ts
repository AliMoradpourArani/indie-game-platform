import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../../infrastructure/db.js';
import { requireAdmin, requireAuth } from '../auth/middleware.js';

export function adminRouter(): Router {
  const router = Router();

  // Prioritizes pending moderation work (see spec §25).
  router.get('/admin/overview', requireAuth, requireAdmin, async (_req: Request, res: Response, next) => {
    try {
      const [pending, changesRequested, published, developers, users] = await Promise.all([
        prisma.submission.count({ where: { state: { in: ['PENDING_REVIEW', 'UNDER_REVIEW'] } } }),
        prisma.submission.count({ where: { state: 'CHANGES_REQUIRED' } }),
        prisma.submission.count({ where: { state: 'PUBLISHED' } }),
        prisma.user.count({ where: { role: 'DEVELOPER' } }),
        prisma.user.count(),
      ]);
      res.json({ pending, changesRequested, published, developers, users });
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/audit', requireAuth, requireAdmin, async (req: Request, res: Response, next) => {
    try {
      const take = Math.min(Number(req.query.take ?? 50), 200);
      const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
