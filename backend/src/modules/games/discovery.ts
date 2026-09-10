import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';

export const browseQuerySchema = z.object({
  search: z.string().max(120).optional(),
  genre: z.string().max(40).optional(),
  tag: z.string().max(30).optional(),
  sort: z.enum(['newest', 'title']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type BrowseQuery = z.infer<typeof browseQuerySchema>;

/**
 * Published-only discovery. Stage 0 search = Postgres ILIKE (+ trigram later);
 * hidden behind this function so a dedicated SearchService can slot in (see ARCHITECTURE).
 */
export async function browseGames(db: PrismaClient, q: BrowseQuery) {
  const publishedGameIds = await db.submission.findMany({
    where: { state: 'PUBLISHED' },
    select: { gameId: true },
    distinct: ['gameId'],
  });
  const ids = publishedGameIds.map((s) => s.gameId);
  if (ids.length === 0) return { data: [], page: q.page, pageSize: q.pageSize, total: 0 };

  const where = {
    id: { in: ids },
    ...(q.genre ? { genre: q.genre } : {}),
    ...(q.tag ? { tags: { has: q.tag } } : {}),
    ...(q.search
      ? { OR: [{ title: { contains: q.search, mode: 'insensitive' as const } }, { description: { contains: q.search, mode: 'insensitive' as const } }] }
      : {}),
  };

  const [total, data] = await Promise.all([
    db.game.count({ where }),
    db.game.findMany({
      where,
      orderBy: q.sort === 'title' ? { title: 'asc' } : { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: {
        id: true, slug: true, title: true, description: true, genre: true, tags: true,
        priceCents: true, currency: true, coverKey: true, createdAt: true,
        developer: { select: { developerProfile: { select: { studioName: true } }, profile: { select: { displayName: true } } } },
      },
    }),
  ]);

  return { data, page: q.page, pageSize: q.pageSize, total };
}

export async function genres(db: PrismaClient): Promise<string[]> {
  const publishedGameIds = await db.submission.findMany({
    where: { state: 'PUBLISHED' },
    select: { gameId: true },
    distinct: ['gameId'],
  });
  const ids = publishedGameIds.map((s) => s.gameId);
  if (ids.length === 0) return [];
  const games = await db.game.findMany({ where: { id: { in: ids } }, select: { genre: true }, distinct: ['genre'] });
  return games.map((g) => g.genre).sort();
}
