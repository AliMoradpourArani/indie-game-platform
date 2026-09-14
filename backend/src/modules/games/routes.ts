import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { loadConfig } from '../../config/env.js';
import { prisma } from '../../infrastructure/db.js';
import { LocalStorageService } from '../../infrastructure/storage/localStorage.js';
import { requireAdmin, requireAuth, requireDeveloper, type AuthRequest } from '../auth/middleware.js';
import {
  archiveGame,
  createGame,
  createVersion,
  deleteGame,
  getPublicGame,
  listOwnGames,
  unarchiveGame,
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

  // Archive / unarchive: studios (own games) and admins.
  router.post('/developer/games/:id/archive', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      const d = deps();
      res.json(await archiveGame(d, req.params.id, req.auth!.sub, req.auth!.role, req.ip));
    } catch (err) {
      next(err);
    }
  });

  router.post('/developer/games/:id/unarchive', requireAuth, requireDeveloper, async (req: AuthRequest, res: Response, next) => {
    try {
      const d = deps();
      res.json(await unarchiveGame(d, req.params.id, req.auth!.sub, req.auth!.role, req.ip));
    } catch (err) {
      next(err);
    }
  });

  // Serve game media bytes (covers/screenshots) for the public game page.
  // Publish-gated + archive-gated: hidden games 404 like the detail endpoint.
  router.get('/games/:slug/media/:mediaId', async (req: Request, res: Response, next) => {
    try {
      const game = await getPublicGame(deps(), req.params.slug);
      const item = (game as { media: { id: string; storageKey: string }[] }).media.find((m) => m.id === req.params.mediaId);
      if (!item) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Media not found' } });
        return;
      }
      if (item.storageKey.startsWith('http://') || item.storageKey.startsWith('https://')) {
        res.redirect(item.storageKey);
        return;
      }
      const d = deps();
      const stream = await d.storage.get(item.storageKey);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function gameAdminRouter(): Router {
  const router = Router();

  router.post('/admin/games/:id/archive', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      const config = loadConfig();
      const d = { db: prisma, storage: new LocalStorageService(config.STORAGE_ROOT) };
      res.json(await archiveGame(d, req.params.id, req.auth!.sub, req.auth!.role, req.ip));
    } catch (err) {
      next(err);
    }
  });

  router.post('/admin/games/:id/unarchive', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      const config = loadConfig();
      const d = { db: prisma, storage: new LocalStorageService(config.STORAGE_ROOT) };
      res.json(await unarchiveGame(d, req.params.id, req.auth!.sub, req.auth!.role, req.ip));
    } catch (err) {
      next(err);
    }
  });

  // Permanent deletion: admin only, reason required, confirm in UI first.
  router.delete('/admin/games/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response, next) => {
    try {
      const body = z.object({ reason: z.string().min(3).max(2000) }).parse(req.body);
      const config = loadConfig();
      const d = { db: prisma, storage: new LocalStorageService(config.STORAGE_ROOT) };
      res.json(await deleteGame(d, req.params.id, req.auth!.sub, body.reason, req.ip));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
