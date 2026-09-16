// Pure recommendation logic — no Prisma, no Express. Fully unit-testable.
// The backend service (service.ts) gathers candidates; everything scored here.
// A future ML engine only needs to implement RecommendationStrategy.

import {
  HALF_LIFE_DAYS,
  MAX_PER_GENRE,
  NEW_GAME_DAYS,
  SCORE_WEIGHTS,
  SIMILARITY_WEIGHTS,
} from './weights.js';

export interface GameMeta {
  id: string;
  genre: string;
  tags: string[];
  createdAt: Date | string;
  purchaseCount?: number;
}

export interface WeightedSignal {
  genre: string;
  tags: string[];
  /** Base weight × recency factor already applied by the caller (or raw). */
  weight: number;
}

export type InterestProfile = {
  genres: Record<string, number>;
  tags: Record<string, number>;
};

export interface ScoredGame<T = GameMeta> {
  game: T;
  score: number;
  /** Human-readable, truthful reason — only set when actually supported. */
  reason?: string;
  breakdown: Record<string, number>;
}

export interface RecommendationStrategy {
  readonly name: string;
  scoreCandidates(candidates: GameMeta[], profile: InterestProfile, ctx: ScoringContext): ScoredGame[];
}

export interface ScoringContext {
  purchaseCounts: Map<string, number>;
  maxPurchases: number;
  now: number;
}

/** Exponential time decay: weight halves every HALF_LIFE_DAYS. */
export function decayFactor(eventTime: number, now: number = Date.now()): number {
  const ageDays = Math.max(0, (now - eventTime) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function decayedWeight(baseWeight: number, eventTime: number, now: number = Date.now()): number {
  return baseWeight * decayFactor(eventTime, now);
}

/** Aggregate weighted signals into a normalized 0..1 interest profile. */
export function buildInterestProfile(signals: WeightedSignal[]): InterestProfile {
  const genres: Record<string, number> = {};
  const tags: Record<string, number> = {};
  for (const s of signals) {
    genres[s.genre] = (genres[s.genre] ?? 0) + s.weight;
    for (const t of s.tags) tags[t] = (tags[t] ?? 0) + s.weight;
  }
  const maxG = Math.max(0, ...Object.values(genres));
  const maxT = Math.max(0, ...Object.values(tags));
  if (maxG > 0) for (const k of Object.keys(genres)) genres[k] = round2(genres[k] / maxG);
  if (maxT > 0) for (const k of Object.keys(tags)) tags[k] = round2(tags[k] / maxT);
  return { genres, tags };
}

export function isProfileEmpty(profile: InterestProfile): boolean {
  return Object.keys(profile.genres).length === 0 && Object.keys(profile.tags).length === 0;
}

export interface Similarity {
  score: number;
  sameGenre: boolean;
  sharedTags: string[];
}

/**
 * Content-based similarity. Same-genre match dominates by design (§25):
 * genre contributes 0.6, shared-tags Jaccard contributes 0.4.
 */
export function contentSimilarity(a: Pick<GameMeta, 'genre' | 'tags'>, b: Pick<GameMeta, 'genre' | 'tags'>): Similarity {
  const sameGenre = a.genre === b.genre;
  const setA = new Set(a.tags);
  const setB = new Set(b.tags);
  const sharedTags = [...setA].filter((t) => setB.has(t));
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union === 0 ? 0 : sharedTags.length / union;
  const score = round2((sameGenre ? 1 : 0) * SIMILARITY_WEIGHTS.GENRE + jaccard * SIMILARITY_WEIGHTS.TAGS);
  return { score, sameGenre, sharedTags };
}

function ageDays(createdAt: Date | string, now: number): number {
  const t = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return Math.max(0, (now - t) / 86_400_000);
}

export function isNewGame(createdAt: Date | string, now: number = Date.now()): boolean {
  return ageDays(createdAt, now) <= NEW_GAME_DAYS;
}

function popularityScore(purchases: number, maxPurchases: number): number {
  if (maxPurchases <= 0) return 0;
  return round2(purchases / maxPurchases);
}

function recencyScore(createdAt: Date | string, now: number): number {
  const d = ageDays(createdAt, now);
  return round2(Math.max(0, 1 - d / 365));
}

/** Default deterministic strategy: rule-based weighted scoring (Stage 1). */
export class RuleBasedStrategy implements RecommendationStrategy {
  readonly name = 'rule-based-v1';

  scoreCandidates(candidates: GameMeta[], profile: InterestProfile, ctx: ScoringContext): ScoredGame[] {
    return candidates.map((game) => {
      const genreMatch = profile.genres[game.genre] ?? 0;
      let tagMatch = 0;
      for (const t of game.tags) tagMatch += profile.tags[t] ?? 0;
      tagMatch = game.tags.length > 0 ? round2(tagMatch / game.tags.length) : 0;

      const purchases = ctx.purchaseCounts.get(game.id) ?? game.purchaseCount ?? 0;
      const popularity = popularityScore(purchases, ctx.maxPurchases);
      const recency = recencyScore(game.createdAt, ctx.now);

      const breakdown = {
        genreMatch: round2(genreMatch * SCORE_WEIGHTS.GENRE_MATCH),
        tagMatch: round2(tagMatch * SCORE_WEIGHTS.TAG_MATCH),
        popularity: round2(popularity * SCORE_WEIGHTS.POPULARITY),
        recency: round2(recency * SCORE_WEIGHTS.RECENCY),
      };
      const score = round2(breakdown.genreMatch + breakdown.tagMatch + breakdown.popularity + breakdown.recency);
      return { game, score, breakdown, reason: explainReason(game, profile, genreMatch) };
    });
  }
}

/** Only produce explanations the scoring actually supports — never fake ones. */
function explainReason(game: GameMeta, profile: InterestProfile, genreMatch: number): string | undefined {
  if (genreMatch >= 0.7) return `Because you enjoy ${game.genre} games`;
  const topTag = game.tags.find((t) => (profile.tags[t] ?? 0) >= 0.5);
  if (topTag) return `Because you like ${topTag}`;
  if (isNewGame(game.createdAt)) return 'New release worth a look';
  return undefined;
}

/** Sort by score desc; tie-break by popularity then recency (stable, deterministic). */
export function rank(scored: ScoredGame[]): ScoredGame[] {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pop = (b.breakdown.popularity ?? 0) - (a.breakdown.popularity ?? 0);
    if (pop !== 0) return pop;
    return (b.breakdown.recency ?? 0) - (a.breakdown.recency ?? 0);
  });
}

/**
 * Diversity guard: cap each genre at MAX_PER_GENRE so one genre cannot dominate
 * unless the profile overwhelmingly supports it — then reserve the final slot
 * for a discovery pick (new or adjacent-genre game).
 */
export function diversify<T extends GameMeta>(ranked: ScoredGame<T>[], limit: number, profile: InterestProfile): ScoredGame<T>[] {
  const picked: ScoredGame<T>[] = [];
  const perGenre = new Map<string, number>();
  const skipped: ScoredGame<T>[] = [];

  for (const s of ranked) {
    if (picked.length >= limit) break;
    const count = perGenre.get(s.game.genre) ?? 0;
    const dominant = (profile.genres[s.game.genre] ?? 0) >= 0.9;
    if (count >= MAX_PER_GENRE && !dominant) {
      skipped.push(s);
      continue;
    }
    picked.push(s);
    perGenre.set(s.game.genre, count + 1);
  }

  // Discovery slot: if we skipped anything and the last pick is not new,
  // swap it for the best skipped new/adjacent game.
  if (skipped.length > 0 && picked.length === limit) {
    const last = picked[picked.length - 1];
    if (!isNewGame(last.game.createdAt)) {
      const discovery = skipped.find((s) => isNewGame(s.game.createdAt))
        ?? skipped.find((s) => !(s.game.genre in profile.genres));
      if (discovery) picked[picked.length - 1] = discovery;
    }
  } else {
    for (const s of skipped) {
      if (picked.length >= limit) break;
      picked.push(s);
    }
  }
  return picked;
}

/** Cold-start fallback ordering: popular first, then newest. */
export function rankColdStart<T extends GameMeta>(games: T[], purchaseCounts: Map<string, number>): T[] {
  return [...games].sort((a, b) => {
    const pa = purchaseCounts.get(a.id) ?? 0;
    const pb = purchaseCounts.get(b.id) ?? 0;
    if (pb !== pa) return pb - pa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
