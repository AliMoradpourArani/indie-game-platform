import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { Errors } from '../../common/errors.js';
import type { StorageService } from '../../infrastructure/storage/types.js';
import { buildGameKey } from '../../infrastructure/storage/localStorage.js';
import { isEditableByDeveloper, type SubmissionState } from '../submissions/domain.js';
import { isVersionString, slugify } from './slug.js';
import { assertValidBuild, assertValidImage } from './uploads.js';
import type { CreateGameInput, UpdateGameInput } from './validation.js';

interface Deps {
  db: PrismaClient;
  storage: StorageService;
}

/** Latest submission state per game (empty = never submitted → draft-like). */
async function latestState(db: PrismaClient, gameId: string): Promise<SubmissionState | null> {
  const sub = await db.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });
  return sub?.state ?? null;
}

async function ownGame(db: PrismaClient, gameId: string, developerId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw Errors.notFound('Game not found');
  if (game.developerId !== developerId) throw Errors.forbidden('Not your game');
  return game;
}

async function assertEditable(db: PrismaClient, gameId: string, developerId: string) {
  await ownGame(db, gameId, developerId);
  const state = await latestState(db, gameId);
  // No submission yet, or an editable state → developer may edit.
  if (state !== null && !isEditableByDeveloper(state)) {
    throw Errors.conflict(`Game is in review state ${state} and cannot be edited`);
  }
}

export async function createGame(deps: Deps, developerId: string, input: CreateGameInput) {
  return deps.db.game.create({
    data: {
      slug: slugify(input.title),
      title: input.title,
      description: input.description,
      genre: input.genre,
      tags: input.tags,
      priceCents: input.priceCents,
      currency: input.currency,
      developerId,
    },
  });
}

export async function listOwnGames(deps: Pick<Deps, 'db'>, developerId: string) {
  return deps.db.game.findMany({
    where: { developerId },
    orderBy: { updatedAt: 'desc' },
    include: { versions: { orderBy: { createdAt: 'desc' } }, submissions: { orderBy: { updatedAt: 'desc' }, take: 1 } },
  });
}

export async function updateGame(deps: Deps, developerId: string, gameId: string, input: UpdateGameInput) {
  await assertEditable(deps.db, gameId, developerId);
  return deps.db.game.update({ where: { id: gameId }, data: input });
}

export async function createVersion(deps: Deps, developerId: string, gameId: string, input: { version: string; changelog: string; requirements?: Record<string, unknown> }) {
  await assertEditable(deps.db, gameId, developerId);
  if (!isVersionString(input.version)) throw Errors.validation('Invalid version string');
  try {
    return await deps.db.gameVersion.create({
      data: { gameId, version: input.version, changelog: input.changelog, requirements: (input.requirements ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  } catch {
    throw Errors.conflict('Version already exists for this game');
  }
}

export async function uploadBuild(
  deps: Deps,
  developerId: string,
  versionId: string,
  meta: { platform: 'WINDOWS' | 'LINUX' | 'MAC' | 'WEB'; demo: boolean },
  file: { mimetype: string; size: number; buffer: Buffer; originalname: string },
) {
  const version = await deps.db.gameVersion.findUnique({ where: { id: versionId }, include: { game: true } });
  if (!version) throw Errors.notFound('Version not found');
  await assertEditable(deps.db, version.gameId, developerId);
  assertValidBuild(file);

  const sha256 = createHash('sha256').update(file.buffer).digest('hex');
  const key = buildGameKey(version.gameId, version.version, meta.platform, file.originalname);
  const stored = await deps.storage.save(key, file.buffer, file.mimetype);
  try {
    return await deps.db.gameBuild.create({
      data: {
        versionId,
        platform: meta.platform,
        storageKey: stored.key,
        sizeBytes: stored.sizeBytes,
        sha256,
        demo: meta.demo,
      },
    });
  } catch {
    await deps.storage.delete(stored.key).catch(() => undefined);
    throw Errors.conflict('Build already exists for this version/platform');
  }
}

export async function uploadMedia(
  deps: Deps,
  developerId: string,
  gameId: string,
  meta: { kind: 'COVER' | 'SCREENSHOT' | 'TRAILER'; sortOrder?: number },
  file: { mimetype: string; size: number; buffer: Buffer; originalname: string },
) {
  await assertEditable(deps.db, gameId, developerId);
  assertValidImage(file);
  const key = buildGameKey(gameId, 'media', meta.kind.toLowerCase(), file.originalname);
  const stored = await deps.storage.save(key, file.buffer, file.mimetype);
  if (meta.kind === 'COVER') {
    await deps.db.game.update({ where: { id: gameId }, data: { coverKey: stored.key } });
  }
  return deps.db.gameMedia.create({
    data: { gameId, kind: meta.kind, storageKey: stored.key, sortOrder: meta.sortOrder ?? 0 },
  });
}

/** Public detail: visible only once the game has a PUBLISHED submission (Phase 5 rules, enforced now). */
export async function getPublicGame(deps: Pick<Deps, 'db'>, slug: string) {
  const game = await deps.db.game.findUnique({
    where: { slug },
    include: {
      versions: { include: { builds: true }, orderBy: { createdAt: 'desc' } },
      media: { orderBy: { sortOrder: 'asc' } },
      submissions: { orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  });
  if (!game) throw Errors.notFound('Game not found');
  const latest = game.submissions[0]?.state ?? null;
  if (latest !== 'PUBLISHED') throw Errors.notFound('Game not found');
  return game;
}
