import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../../infrastructure/db.js';
import { optionalAuth, requireAuth, type AuthRequest } from '../auth/middleware.js';
import {
  getOnboardingStatus,
  getRecommendations,
  getSimilarGames,
  listPreferenceGames,
  recordEvent,
  saveOnboarding,
  skipOnboarding,
  assertSupportedType,
} from './service.js';
import { clientEventSchema, limitSchema, onboardingSchema } from './validation.js';

export function recommendationsRouter(): Router {
  const router = Router();

  // External preference anchors (never marketplace games).
  router.get('/preferences/games', (_req: Request, res: Response) => {
    res.json(listPreferenceGames());
  });

  router.get('/onboarding', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await getOnboardingStatus(prisma, req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  router.post('/onboarding', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = onboardingSchema.parse(req.body);
      res.status(201).json(await saveOnboarding(prisma, req.auth!.sub, body.externalGameIds));
    } catch (err) {
      next(err);
    }
  });

  router.post('/onboarding/skip', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await skipOnboarding(prisma, req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  // Behavior events — purchase claims are rejected here; the purchases module
  // emits GAME_PURCHASED server-side from trusted tables (§51).
  router.post('/events', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = clientEventSchema.parse(req.body);
      assertSupportedType(body.type);
      const created = await recordEvent(
        prisma,
        req.auth!.sub,
        body.type,
        body.gameId,
        body.metadata as Record<string, unknown> | undefined,
      );
      res.status(201).json({ id: created.id, eventType: created.eventType });
    } catch (err) {
      next(err);
    }
  });

  // Personalized homepage feed (anonymous → cold-start fallback).
  router.get('/recommendations', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const { limit } = limitSchema.parse(req.query);
      res.json(await getRecommendations(prisma, req.auth?.sub ?? null, limit));
    } catch (err) {
      next(err);
    }
  });

  // Similar games for a game-detail page ("You might also like").
  router.get('/games/:slug/similar', optionalAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const { limit } = limitSchema.parse(req.query);
      res.json(await getSimilarGames(prisma, req.params.slug, limit, req.auth?.sub ?? null));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
