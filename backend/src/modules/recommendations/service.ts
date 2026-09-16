// Application layer: Prisma-backed recommendation use-cases.
// Presentation (routes.ts) → here → pure domain.ts. Never the reverse.
// Reads Purchase/Entitlement/Rating rows read-only to build signals —
// ownership/entitlement truth always comes from these backend tables,
// never from client claims (§51).

import type { PrismaClient } from '@prisma/client';
import { Errors } from '../../common/errors.js';
import {
  buildInterestProfile,
  contentSimilarity,
  diversify,
  isProfileEmpty,
  rank,
  rankColdStart,
  RuleBasedStrategy,
  type GameMeta,
  type InterestProfile,
  type WeightedSignal,
} from './domain.js';
import { getPreferenceGame, isValidPreferenceId, MAX_ONBOARDING_SELECTIONS, PREFERENCE_GAMES } from './preferenceGames.js';
import { EVENT_WEIGHTS, SUPPORTED_EVENT_TYPES, type SupportedEventType } from './weights.js';
import { decayedWeight } from './domain.js';

type Db = PrismaClient;

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  genre: true,
  tags: true,
  priceCents: true,
  currency: true,
  coverKey: true,
  createdAt: true,
} as const;

export function listPreferenceGames() {
  return PREFERENCE_GAMES;
}

/** Game ids with at least one PUBLISHED submission (same publish-gating as discovery). */
export async function publishedGameIds(db: Db): Promise<string[]> {
  const rows = await db.submission.findMany({
    where: { state: 'PUBLISHED' },
    select: { gameId: true },
    distinct: ['gameId'],
  });
  return rows.map((r) => r.gameId);
}

async function publishedCandidates(db: Db, excludeIds: string[] = []) {
  const ids = await publishedGameIds(db);
  const wanted = ids.filter((id) => !excludeIds.includes(id));
  if (wanted.length === 0) return [];
  return db.game.findMany({
    where: { id: { in: wanted }, isArchived: false },
    select: { ...CARD_SELECT },
  });
}

async function purchaseCounts(db: Db): Promise<Map<string, number>> {
  const rows = await db.purchase.groupBy({
    by: ['gameId'],
    where: { status: 'COMPLETED' },
    _count: { gameId: true },
  });
  return new Map(rows.map((r) => [r.gameId, r._count.gameId]));
}

async function ownedGameIds(db: Db, userId: string): Promise<Set<string>> {
  const rows = await db.entitlement.findMany({ where: { userId }, select: { gameId: true } });
  return new Set(rows.map((r) => r.gameId));
}

// ---- Onboarding ----

export async function getOnboardingStatus(db: Db, userId: string) {
  const profile = await db.profile.findUnique({ where: { userId } });
  return {
    completed: profile?.onboardingCompleted ?? false,
    skipped: profile?.onboardingSkipped ?? false,
  };
}

export async function saveOnboarding(db: Db, userId: string, externalGameIds: string[]) {
  const deduped = [...new Set(externalGameIds)];
  if (deduped.length > MAX_ONBOARDING_SELECTIONS) {
    throw Errors.validation(`Select up to ${MAX_ONBOARDING_SELECTIONS} games`);
  }
  for (const id of deduped) {
    if (!isValidPreferenceId(id)) throw Errors.validation(`Unknown preference game: ${id}`);
  }
  await db.userPreference.deleteMany({ where: { userId } });
  if (deduped.length > 0) {
    await db.userPreference.createMany({
      data: deduped.map((externalGameId) => ({ userId, externalGameId })),
    });
  }
  await db.profile.upsert({
    where: { userId },
    update: { onboardingCompleted: true, onboardingSkipped: false },
    create: { userId, displayName: 'Player', onboardingCompleted: true, onboardingSkipped: false },
  });
  return { completed: true as const, selected: deduped.length };
}

export async function skipOnboarding(db: Db, userId: string) {
  await db.profile.upsert({
    where: { userId },
    update: { onboardingSkipped: true },
    create: { userId, displayName: 'Player', onboardingSkipped: true },
  });
  return { skipped: true as const };
}

// ---- Event tracking ----

export function assertSupportedType(type: string): asserts type is SupportedEventType {
  if (!(SUPPORTED_EVENT_TYPES as string[]).includes(type)) {
    throw Errors.validation(`Unsupported event type: ${type}`);
  }
}

async function assertTrackableGame(db: Db, gameId: string) {
  const game = await db.game.findUnique({ where: { id: gameId }, select: { id: true, isArchived: true } });
  if (!game || game.isArchived) throw Errors.notFound('Game not found');
}

/**
 * Record a behavior event. Repeat views within 24h are stored as
 * GAME_VIEW_REPEATED so scoring can weight sustained interest higher.
 */
export async function recordEvent(
  db: Db,
  userId: string,
  type: SupportedEventType,
  gameId?: string,
  metadata?: Record<string, unknown>,
) {
  if (gameId) await assertTrackableGame(db, gameId);
  let finalType = type;
  if (type === 'GAME_VIEWED' && gameId) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const prior = await db.userEvent.findFirst({
      where: {
        userId,
        gameId,
        eventType: { in: ['GAME_VIEWED', 'GAME_VIEW_REPEATED'] },
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (prior) finalType = 'GAME_VIEW_REPEATED';
  }
  return db.userEvent.create({
    data: {
      userId,
      eventType: finalType,
      gameId: gameId ?? null,
      metadata: (metadata ?? {}) as object,
    },
  });
}

// ---- Interest profile ----

async function gameMetaById(db: Db, ids: string[]): Promise<Map<string, { genre: string; tags: string[] }>> {
  if (ids.length === 0) return new Map();
  const games = await db.game.findMany({ where: { id: { in: ids } }, select: { id: true, genre: true, tags: true } });
  return new Map(games.map((g) => [g.id, { genre: g.genre, tags: g.tags }]));
}

export async function collectSignals(db: Db, userId: string, now: number = Date.now()): Promise<WeightedSignal[]> {
  const signals: WeightedSignal[] = [];

  const prefs = await db.userPreference.findMany({ where: { userId }, select: { externalGameId: true } });
  for (const p of prefs) {
    const ext = getPreferenceGame(p.externalGameId);
    if (ext) signals.push({ genre: ext.genres[0], tags: ext.tags, weight: EVENT_WEIGHTS.ONBOARDING_SELECTION });
  }

  const events = await db.userEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { eventType: true, gameId: true, createdAt: true },
  });
  const eventGameIds = [...new Set(events.map((e: { gameId: string | null }) => e.gameId).filter((g): g is string => !!g))];
  const meta = await gameMetaById(db, eventGameIds);
  for (const e of events) {
    if (!e.gameId) continue;
    const m = meta.get(e.gameId);
    if (!m) continue;
    const base = EVENT_WEIGHTS[e.eventType as SupportedEventType] ?? 0;
    if (base <= 0) continue;
    signals.push({ genre: m.genre, tags: m.tags, weight: decayedWeight(base, e.createdAt.getTime(), now) });
  }

  const purchases = await db.purchase.findMany({
    where: { buyerId: userId, status: 'COMPLETED' },
    select: { gameId: true, createdAt: true },
  });
  const purchaseMeta = await gameMetaById(
    db,
    purchases.map((p) => p.gameId).filter((id) => !meta.has(id)),
  );
  for (const p of purchases) {
    const m = meta.get(p.gameId) ?? purchaseMeta.get(p.gameId);
    if (!m) continue;
    signals.push({ genre: m.genre, tags: m.tags, weight: decayedWeight(EVENT_WEIGHTS.GAME_PURCHASED, p.createdAt.getTime(), now) });
  }

  const ratings = await db.gameRating.findMany({
    where: { userId, stars: { gte: 4 } },
    select: { gameId: true },
  });
  const ratingMeta = await gameMetaById(
    db,
    ratings.map((r) => r.gameId).filter((id) => !meta.has(id) && !purchaseMeta.has(id)),
  );
  for (const r of ratings) {
    const m = meta.get(r.gameId) ?? purchaseMeta.get(r.gameId) ?? ratingMeta.get(r.gameId);
    if (!m) continue;
    signals.push({ genre: m.genre, tags: m.tags, weight: EVENT_WEIGHTS.HIGH_RATING });
  }

  return signals.filter((s) => s.weight > 0.01);
}

export async function getInterestProfile(db: Db, userId: string, now: number = Date.now()): Promise<InterestProfile> {
  return buildInterestProfile(await collectSignals(db, userId, now));
}

// ---- Recommendations ----

export interface RecommendationItem {
  game: Record<string, unknown>;
  score: number | null;
  reason?: string;
}

const strategy = new RuleBasedStrategy();

export async function getRecommendations(
  db: Db,
  userId: string | null,
  limit = 10,
  now: number = Date.now(),
): Promise<{ mode: 'personalized' | 'cold-start'; strategy: string; items: RecommendationItem[] }> {
  const counts = await purchaseCounts(db);

  if (!userId) {
    const games = await publishedCandidates(db);
    return {
      mode: 'cold-start',
      strategy: strategy.name,
      items: rankColdStart(games, counts).slice(0, limit).map((game) => ({ game, score: null })),
    };
  }

  const owned = await ownedGameIds(db, userId);
  const games = (await publishedCandidates(db, [...owned])).filter((g) => !owned.has(g.id));
  if (games.length === 0) return { mode: 'cold-start', strategy: strategy.name, items: [] };

  const profile = await getInterestProfile(db, userId, now);
  if (isProfileEmpty(profile)) {
    return {
      mode: 'cold-start',
      strategy: strategy.name,
      items: rankColdStart(games, counts).slice(0, limit).map((game) => ({ game, score: null })),
    };
  }

  const metas: GameMeta[] = games.map((g) => ({
    id: g.id,
    genre: g.genre,
    tags: g.tags,
    createdAt: g.createdAt,
    purchaseCount: counts.get(g.id) ?? 0,
  }));
  const maxPurchases = Math.max(0, ...counts.values());
  const scored = rank(strategy.scoreCandidates(metas, profile, { purchaseCounts: counts, maxPurchases, now }));
  const picked = diversify(scored, limit, profile);
  const byId = new Map(games.map((g) => [g.id, g]));
  return {
    mode: 'personalized',
    strategy: strategy.name,
    items: picked.map((s) => ({ game: byId.get(s.game.id)!, score: s.score, reason: s.reason })),
  };
}

/**
 * Similar games for a game-detail page. Content similarity first
 * (same genre dominates), then a small personalization boost when the
 * viewer is known, popularity as tie-break. Owned/current/unpublished
 * games are always filtered out.
 */
export async function getSimilarGames(
  db: Db,
  slug: string,
  limit = 8,
  viewerId: string | null = null,
  now: number = Date.now(),
): Promise<{ strategy: string; items: RecommendationItem[] }> {
  const current = await db.game.findUnique({ where: { slug }, select: { ...CARD_SELECT, isArchived: true } });
  if (!current) throw Errors.notFound('Game not found');
  if (current.isArchived) throw Errors.notFound('Game not found');
  const latest = await db.submission.findFirst({ where: { gameId: current.id }, orderBy: { updatedAt: 'desc' }, select: { state: true } });
  if (!latest || latest.state !== 'PUBLISHED') throw Errors.notFound('Game not found');

  const owned = viewerId ? await ownedGameIds(db, viewerId) : new Set<string>();
  const games = (await publishedCandidates(db, [current.id, ...owned])).filter((g) => g.id !== current.id && !owned.has(g.id));
  const counts = await purchaseCounts(db);
  const profile = viewerId ? await getInterestProfile(db, viewerId, now) : null;

  const scored = games.map((g) => {
    const sim = contentSimilarity(current, g);
    const boost = profile ? (profile.genres[g.genre] ?? 0) * 0.3 : 0;
    const popularity = counts.get(g.id) ?? 0;
    const score = Math.round((sim.score + boost) * 100) / 100;
    const reason = sim.sameGenre
      ? `More ${current.genre} games`
      : sim.sharedTags.length > 0
        ? `Shares ${sim.sharedTags.slice(0, 2).join(', ')}`
        : undefined;
    return { game: g, score, reason, popularity, sim: sim.score };
  });

  scored.sort((a, b) => b.score - a.score || b.sim - a.sim || b.popularity - a.popularity);
  return { strategy: strategy.name, items: scored.slice(0, limit).map(({ game, score, reason }) => ({ game, score, reason })) };
}
