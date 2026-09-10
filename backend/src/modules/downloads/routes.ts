import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from '../../config/env.js';
import { Errors } from '../../common/errors.js';
import { prisma } from '../../infrastructure/db.js';
import { LocalStorageService } from '../../infrastructure/storage/localStorage.js';
import { requireAuth, type AuthRequest } from '../auth/middleware.js';
import { createDownloadToken, verifyDownloadToken } from './tokens.js';

/**
 * Controlled downloads. Full builds require a library entitlement; demo builds
 * of published games are open to everyone. Bytes stream from storage — never a
 * public static directory. Tokens expire (default 10 min).
 */
export function downloadsRouter(): Router {
  const router = Router();

  router.get('/library/:gameId/download/:buildId', requireAuth, async (req: AuthRequest, res: Response, next) => {
    try {
      const config = loadConfig();
      const { gameId, buildId } = req.params;
      const build = await prisma.gameBuild.findUnique({
        where: { id: buildId },
        include: { version: { select: { gameId: true } } },
      });
      if (!build || build.version.gameId !== gameId) throw Errors.notFound('Build not found');

      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) throw Errors.notFound('Game not found');
      const latest = await prisma.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });
      if (!latest || latest.state !== 'PUBLISHED') throw Errors.notFound('Game not found');

      if (!build.demo) {
        const ent = await prisma.entitlement.findUnique({
          where: { userId_gameId: { userId: req.auth!.sub, gameId } },
        });
        if (!ent) throw Errors.paymentRequired('Purchase this game to download');
      }

      const token = createDownloadToken(
        { userId: req.auth!.sub, buildId, exp: Math.floor(Date.now() / 1000) + 600 },
        config.DOWNLOAD_TOKEN_SECRET,
      );
      res.json({ url: `/api/v1/files/${token}` });
    } catch (err) {
      next(err);
    }
  });

  router.get('/files/:token', async (req: Request, res: Response, next) => {
    try {
      const config = loadConfig();
      const claims = verifyDownloadToken(req.params.token, config.DOWNLOAD_TOKEN_SECRET);
      const build = await prisma.gameBuild.findUnique({ where: { id: claims.buildId } });
      if (!build) throw Errors.notFound('Build not found');

      const storage = new LocalStorageService(config.STORAGE_ROOT);
      const stream = await storage.get(build.storageKey);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${build.id}.zip"`);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
