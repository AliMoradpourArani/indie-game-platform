import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { loadConfig } from '../../config/env.js';
import { prisma } from '../../infrastructure/db.js';
import { LocalStorageService } from '../../infrastructure/storage/localStorage.js';
import { requireAuth, requireDeveloper, type AuthRequest } from '../auth/middleware.js';
import {
  createGame,
  createVersion,
  getPublicGame,
  listOwnGames,
  updateGame,
  uploadBuild,
  uploadMedia,
} from './service.js';
import { browseGames, browseQuerySchema, genres } from './discovery.js';
import { createBuildSchema, createGameSchema, createVersionSchema, updateGameSchema } from './validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024, files: 1 },
});

function deps() {
  const config = loadConfig();
  return { db: prisma, storage: new LocalStorageService(config.STORAGE_ROOT) };
}

export function gamesRouter(): Router {
  const router = Router();

  // Public discovery (publish-gated; browse UI lands in Phase 5).
  router.get('/games', async (req: Request, res: Response, next) => {
    try {
      res.json(await browseGames(prisma, browseQuerySchema.parse(req.query)));
    } catch (err) {
      next(err);
    }
  });

  router.get('/genres', async (_req: Request, res: Response, next) => {
    try {
      res.json(await genres(prisma));
    } catch (err) {
      next(err);
    }
  });

  router.get('/games/:slug', async (req: Request, res: Response, next) => {
    try {
      res.json(await getPublicGame(deps(), req.params.slug));
    } catch (err) {
      next(err);
    }
  });

  // Developer area.
  router.post('/developer/games', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await createGame(deps(), req.auth!.sub, createGameSchema.parse(req.body));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/developer/games', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await listOwnGames(deps(), req.auth!.sub));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/developer/games/:id', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      res.json(await updateGame(deps(), req.auth!.sub, req.params.id, updateGameSchema.parse(req.body)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/developer/games/:id/versions', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      const result = await createVersion(deps(), req.auth!.sub, req.params.id, createVersionSchema.parse(req.body));
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/developer/versions/:versionId/builds',
    requireAuth,
    requireDeveloper,
    upload.single('file'),
    async (req: AuthRequest, res: Response, next) => {
      try {
        const meta = createBuildSchema.omit({ sha256: true, sizeBytes: true }).parse(req.body);
        if (!req.file) throw Object.assign(new Error('File is required'), { status: 422 });
        const build = await uploadBuild(
          deps(),
          req.auth!.sub,
          req.params.versionId,
          { platform: meta.platform, demo: meta.demo },
          { mimetype: req.file.mimetype, size: req.file.size, buffer: req.file.buffer, originalname: req.file.originalname },
        );
        res.status(201).json(build);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/developer/games/:id/media',
    requireAuth,
    requireDeveloper,
    upload.single('file'),
    async (req: AuthRequest, res: Response, next) => {
      try {
        const meta = z.object({ kind: z.enum(['COVER', 'SCREENSHOT', 'TRAILER']), sortOrder: z.coerce.number().int().min(0).default(0) }).parse(req.body);
        if (!req.file) throw Object.assign(new Error('File is required'), { status: 422 });
        const media = await uploadMedia(
          deps(),
          req.auth!.sub,
          req.params.id,
          meta,
          { mimetype: req.file.mimetype, size: req.file.size, buffer: req.file.buffer, originalname: req.file.originalname },
        );
        res.status(201).json(media);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
