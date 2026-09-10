import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { loadConfig } from '../../config/env.js';
import { prisma } from '../../infrastructure/db.js';
import { requireAdmin, requireAuth, requireDeveloper, type AuthRequest } from '../auth/middleware.js';
import {
  claimSubmission,
  latestSubmissionForGame,
  publishGame,
  reviewQueue,
  reviewSubmission,
  submissionHistory,
  submitForReview,
  withdrawSubmission,
} from './service.js';

function deps() {
  void loadConfig();
  return { db: prisma };
}

function ipOf(req: Request): string | undefined {
  return req.ip;
}

export function submissionsRouter(): Router {
  const router = Router();

  // Developer actions.
  router.post('/developer/games/:id/submit', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.status(201).json(await submitForReview(deps(), req.auth!.sub, req.params.id, ipOf(req)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/developer/submissions/:id/withdraw', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await withdrawSubmission(deps(), req.auth!.sub, req.params.id, ipOf(req)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/developer/games/:id/publish', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await publishGame(deps(), req.auth!.sub, req.params.id, ipOf(req)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/developer/games/:id/submission', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await latestSubmissionForGame(deps(), req.auth!.sub, req.params.id));
    } catch (err) {
      next(err);
    }
  });

  // Admin actions.
  router.get('/admin/submissions', requireAuth, requireAdmin, async (req: Request, res: Response, next) => {
    try {
      const state = z.enum(['DRAFT', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUIRED', 'REJECTED', 'PUBLISHED']).optional().parse(req.query.state);
      res.json(await reviewQueue(deps(), state));
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/submissions/:id/claim', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await claimSubmission(deps(), req.auth!.sub, req.params.id, ipOf(req)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/submissions/:id/review', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({
        decision: z.enum(['APPROVED', 'CHANGES_REQUIRED', 'REJECTED']),
        comment: z.string().min(1).max(5000),
      }).parse(req.body);
      const result = await reviewSubmission(deps(), req.auth!.sub, req.params.id, body.decision, body.comment, ipOf(req));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/admin/submissions/:id/history', requireAuth, requireAdmin, async (req: Request, res: Response, next) => {
    try {
      res.json(await submissionHistory(deps(), req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
