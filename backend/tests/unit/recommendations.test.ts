// Rule-based recommendation engine: scoring, similarity, decay, diversity.
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  buildInterestProfile,
  contentSimilarity,
  decayFactor,
  diversify,
  isProfileEmpty,
  rank,
  rankColdStart,
  RuleBasedStrategy,
  type GameMeta,
} from '../../src/modules/recommendations/domain.js';
import { MAX_ONBOARDING_SELECTIONS, PREFERENCE_GAMES } from '../../src/modules/recommendations/preferenceGames.js';
import { recordEvent } from '../../src/modules/recommendations/service.js';
import { eventSchema, onboardingSchema } from '../../src/modules/recommendations/validation.js';
import { EVENT_WEIGHTS, MAX_PER_GENRE } from '../../src/modules/recommendations/weights.js';

function game(over: Partial<GameMeta> & { id: string }): GameMeta {
  return {
    genre: 'Action',
    tags: [],
    createdAt: new Date('2026-01-01'),
    purchaseCount: 0,
    ...over,
  };
}

describe('preference catalog (external anchors, never marketplace games)', () => {
  it('offers a dozen well-known games with genre/tag metadata', () => {
    expect(PREFERENCE_GAMES.length).toBeGreaterThanOrEqual(10);
    for (const g of PREFERENCE_GAMES) {
      expect(g.name.length).toBeGreaterThan(0);
      expect(g.genres.length).toBeGreaterThanOrEqual(1);
      expect(g.tags.length).toBeGreaterThanOrEqual(2);
    }
    expect(new Set(PREFERENCE_GAMES.map((g) => g.id)).size).toBe(PREFERENCE_GAMES.length);
  });

  it('caps onboarding selections at five', () => {
    expect(MAX_ONBOARDING_SELECTIONS).toBe(5);
    expect(() => onboardingSchema.parse({ externalGameIds: ['a', 'b', 'c', 'd', 'e', 'f'] })).toThrow();
    expect(onboardingSchema.parse({ externalGameIds: ['a', 'b'] }).externalGameIds).toHaveLength(2);
    expect(onboardingSchema.parse({}).externalGameIds).toHaveLength(0);
  });
});

describe('event model', () => {
  it('accepts only supported behavior types (no fake cart/wishlist)', () => {
    expect(eventSchema.parse({ type: 'GAME_VIEWED', gameId: 'g1' }).type).toBe('GAME_VIEWED');
    expect(() => eventSchema.parse({ type: 'GAME_ADDED_TO_CART', gameId: 'g1' })).toThrow();
    expect(EVENT_WEIGHTS.GAME_PURCHASED).toBeGreaterThan(EVENT_WEIGHTS.GAME_VIEWED);
    expect(EVENT_WEIGHTS.DEMO_DOWNLOADED).toBeGreaterThan(EVENT_WEIGHTS.GAME_VIEW_REPEATED);
  });

  it('stores a repeat view when the game was already viewed within 24h', async () => {
    const created: { eventType: string }[] = [];
    const fake = {
      game: { findUnique: async () => ({ id: 'g1', isArchived: false }) },
      userEvent: {
        findFirst: async () => ({ id: 'prior' }),
        create: async (args: { data: { eventType: string } }) => {
          created.push({ eventType: args.data.eventType });
          return { id: 'new', eventType: args.data.eventType };
        },
      },
    } as unknown as PrismaClient;
    const evt = await recordEvent(fake, 'u1', 'GAME_VIEWED', 'g1');
    expect(evt.eventType).toBe('GAME_VIEW_REPEATED');
  });

  it('keeps a first view as GAME_VIEWED', async () => {
    const fake = {
      game: { findUnique: async () => ({ id: 'g1', isArchived: false }) },
      userEvent: {
        findFirst: async () => null,
        create: async (args: { data: { eventType: string } }) => ({ id: 'new', eventType: args.data.eventType }),
      },
    } as unknown as PrismaClient;
    const evt = await recordEvent(fake, 'u1', 'GAME_VIEWED', 'g1');
    expect(evt.eventType).toBe('GAME_VIEWED');
  });
});

describe('time decay', () => {
  it('is 1.0 now and decreases monotonically', () => {
    const now = Date.now();
    expect(decayFactor(now, now)).toBeCloseTo(1);
    const week = decayFactor(now - 7 * 86_400_000, now);
    const year = decayFactor(now - 365 * 86_400_000, now);
    expect(week).toBeLessThan(1);
    expect(year).toBeLessThan(week);
  });
});

describe('interest profile', () => {
  it('selecting Hades-like signals ranks Action first', () => {
    const profile = buildInterestProfile([
      { genre: 'Action', tags: ['Indie', 'Singleplayer'], weight: 3 },
      { genre: 'Action', tags: ['Indie'], weight: 1 },
      { genre: 'Puzzle', tags: ['Relaxing'], weight: 0.5 },
    ]);
    expect(profile.genres.Action).toBeGreaterThan(profile.genres.Puzzle ?? 0);
    expect(profile.genres.Action).toBe(1);
    expect(isProfileEmpty(profile)).toBe(false);
  });

  it('empty signals produce an empty profile (cold start)', () => {
    expect(isProfileEmpty(buildInterestProfile([]))).toBe(true);
  });
});

describe('content similarity', () => {
  it('prioritizes same-genre games over unrelated genres', () => {
    const current = { genre: 'Action', tags: ['Indie', 'Fast-paced'] };
    const same = contentSimilarity(current, { genre: 'Action', tags: ['Souls-like'] });
    const other = contentSimilarity(current, { genre: 'Puzzle', tags: ['Relaxing'] });
    expect(same.sameGenre).toBe(true);
    expect(same.score).toBeGreaterThan(other.score);
  });
});

describe('scoring and ranking', () => {
  const strategy = new RuleBasedStrategy();

  function scored() {
    const profile = buildInterestProfile([{ genre: 'Action', tags: ['Indie'], weight: 3 }]);
    const candidates = [
      game({ id: 'a', genre: 'Action', tags: ['Indie'], purchaseCount: 5 }),
      game({ id: 'b', genre: 'Puzzle', tags: ['Relaxing'], purchaseCount: 100 }),
    ];
    const ctx = { purchaseCounts: new Map([['a', 5], ['b', 100]]), maxPurchases: 100, now: Date.now() };
    return rank(strategy.scoreCandidates(candidates, profile, ctx));
  }

  it('ranks a stronger preference match above raw popularity', () => {
    const [first] = scored();
    expect(first.game.id).toBe('a');
    expect(first.reason).toContain('Action');
  });

  it('never invents explanations without support', () => {
    const profile = buildInterestProfile([{ genre: 'Strategy', tags: ['Historical'], weight: 3 }]);
    const old = game({ id: 'z', genre: 'Puzzle', tags: ['Cute'], createdAt: new Date('2020-01-01') });
    const [s] = strategy.scoreCandidates(
      [old],
      profile,
      { purchaseCounts: new Map(), maxPurchases: 0, now: Date.now() },
    );
    expect(s.reason).toBeUndefined();
  });
});

describe('diversity and cold start', () => {
  it(`caps a single genre at ${MAX_PER_GENRE} picks when alternatives exist`, () => {
    const ranked = [
      ...Array.from({ length: 6 }, (_, i) => ({
        game: game({ id: `a${i}`, genre: 'Action', purchaseCount: 10 - i }),
        score: 10 - i,
        breakdown: {},
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        game: game({ id: `p${i}`, genre: 'Puzzle', purchaseCount: 1 }),
        score: 1 - i * 0.1,
        breakdown: {},
      })),
    ];
    const picked = diversify(ranked, 6, { genres: { Action: 0.5 }, tags: {} });
    expect(picked.filter((p) => p.game.genre === 'Action').length).toBeLessThanOrEqual(MAX_PER_GENRE);
    expect(picked.length).toBe(6);
  });

  it('backfills from skipped genres rather than returning a short set', () => {
    const ranked = Array.from({ length: 8 }, (_, i) => ({
      game: game({ id: `a${i}`, genre: 'Action', purchaseCount: 10 - i }),
      score: 10 - i,
      breakdown: {},
    }));
    const picked = diversify(ranked, 8, { genres: { Action: 0.5 }, tags: {} });
    expect(picked.length).toBe(8);
  });

  it('cold start orders by popularity then newest', () => {
    const games = [
      game({ id: 'old-pop', purchaseCount: 0, createdAt: new Date('2024-01-01') }),
      game({ id: 'new-pop', purchaseCount: 0, createdAt: new Date('2026-08-01') }),
    ];
    const counts = new Map([['old-pop', 50], ['new-pop', 2]]);
    const ordered = rankColdStart(games, counts);
    expect(ordered[0].id).toBe('old-pop');
    const tied = rankColdStart(games, new Map());
    expect(tied[0].id).toBe('new-pop');
  });
});
