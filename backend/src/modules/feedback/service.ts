import type { PrismaClient } from '@prisma/client';
import { Errors } from '../../common/errors.js';

interface Deps {
  db: PrismaClient;
}

async function publishedGameOrThrow(db: PrismaClient, gameId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game || game.isArchived) throw Errors.notFound('Game not found');
  const latest = await db.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });
  if (!latest || latest.state !== 'PUBLISHED') throw Errors.notFound('Game not found');
  return game;
}

export async function listComments(deps: Deps, gameId: string) {
  await publishedGameOrThrow(deps.db, gameId);
  const rows = await deps.db.gameComment.findMany({
    where: { gameId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { author: { select: { id: true, profile: { select: { displayName: true } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: c.author.profile?.displayName ?? 'Player',
  }));
}

export async function postComment(deps: Deps, gameId: string, authorId: string, body: string) {
  await publishedGameOrThrow(deps.db, gameId);
  const text = body.trim();
  if (text.length < 1 || text.length > 2000) throw Errors.validation('Comment must be 1–2000 characters');
  const created = await deps.db.gameComment.create({ data: { gameId, authorId, body: text } });
  return created;
}

export async function ratingSummary(deps: Deps, gameId: string) {
  await publishedGameOrThrow(deps.db, gameId);
  const agg = await deps.db.gameRating.aggregate({
    where: { gameId },
    _avg: { stars: true },
    _count: { stars: true },
  });
  return { average: agg._avg.stars ?? 0, count: agg._count.stars ?? 0 };
}

export async function rateGame(deps: Deps, gameId: string, userId: string, stars: number) {
  await publishedGameOrThrow(deps.db, gameId);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw Errors.validation('Rating must be an integer between 1 and 5');
  }
  const rating = await deps.db.gameRating.upsert({
    where: { gameId_userId: { gameId, userId } },
    update: { stars },
    create: { gameId, userId, stars },
  });
  return { ...(await ratingSummary(deps, gameId)), mine: rating.stars };
}

export async function validateDiscount(deps: Deps, code: string | undefined) {
  if (!code?.trim()) return null;
  const normalized = code.trim().toUpperCase();
  const found = await deps.db.discountCode.findUnique({ where: { code: normalized } });
  if (!found || !found.active) throw Errors.validation('Discount code is invalid or expired');
  return found;
}

export async function listDiscounts(deps: Deps) {
  return deps.db.discountCode.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createDiscount(deps: Deps, code: string, percentOff: number) {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,32}$/.test(normalized)) throw Errors.validation('Code must be 3–32 chars (A–Z, 0–9, -)');
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 90) {
    throw Errors.validation('percentOff must be an integer between 1 and 90');
  }
  try {
    return await deps.db.discountCode.create({ data: { code: normalized, percentOff } });
  } catch {
    throw Errors.conflict('Discount code already exists');
  }
}
