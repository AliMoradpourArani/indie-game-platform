import { Router } from 'express';
import type { Request, Response } from 'express';

export function healthRouter(): Router {
  const router = Router();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'indie-game-platform', time: new Date().toISOString() });
  });

  // Readiness checks DB + storage in later phases; static ok for Phase 1 skeleton.
  router.get('/ready', (_req: Request, res: Response) => {
    res.json({ ready: true, checks: { database: 'pending-phase-1', storage: 'local' } });
  });

  return router;
}
