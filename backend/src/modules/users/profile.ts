import type { PrismaClient } from '@prisma/client';
import { Errors } from '../../common/errors.js';

/** Public developer profile: studio info + their PUBLISHED games only. */
export async function getDeveloperProfile(db: PrismaClient, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      profile: { select: { displayName: true, bio: true, avatarKey: true } },
      developerProfile: { select: { studioName: true, website: true, verified: true } },
    },
  });
  if (!user || !user.developerProfile) throw Errors.notFound('Developer not found');

  const published = await db.submission.findMany({
    where: { state: 'PUBLISHED', game: { developerId: userId } },
    select: { gameId: true },
    distinct: ['gameId'],
  });
  const games = await db.game.findMany({
    where: { id: { in: published.map((p) => p.gameId) } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, slug: true, title: true, genre: true, priceCents: true, currency: true, coverKey: true },
  });

  return { ...user, games };
}
