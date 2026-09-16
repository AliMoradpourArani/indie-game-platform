// Central scoring configuration. Tune these numbers — no migration needed.
// Only behavior the product actually supports is listed. Cart/wishlist entries
// are reserved for the future (no CartItem/WishlistItem models exist yet).

export const EVENT_WEIGHTS = {
  GAME_VIEWED: 1,
  GAME_VIEW_REPEATED: 2.5,
  RECOMMENDATION_CLICKED: 1.5,
  GAME_OPENED_FROM_RECOMMENDATION: 2,
  DEMO_DOWNLOADED: 4,
  GAME_PURCHASED: 5,
  // Derived signals (not stored event types):
  ONBOARDING_SELECTION: 3,
  HIGH_RATING: 2, // stars >= 4 on a marketplace game
  // Reserved — product has no cart/wishlist models yet. Do NOT emit these.
  CART_RESERVED: 4,
  WISHLIST_RESERVED: 3.5,
} as const;

export type SupportedEventType =
  | 'GAME_VIEWED'
  | 'GAME_VIEW_REPEATED'
  | 'DEMO_DOWNLOADED'
  | 'GAME_PURCHASED'
  | 'RECOMMENDATION_CLICKED'
  | 'GAME_OPENED_FROM_RECOMMENDATION';

export const SUPPORTED_EVENT_TYPES: SupportedEventType[] = [
  'GAME_VIEWED',
  'GAME_VIEW_REPEATED',
  'DEMO_DOWNLOADED',
  'GAME_PURCHASED',
  'RECOMMENDATION_CLICKED',
  'GAME_OPENED_FROM_RECOMMENDATION',
];

/** Recency half-life: a signal's contribution halves every HALF_LIFE_DAYS. */
export const HALF_LIFE_DAYS = 30;

/** Content-similarity blend: same-genre match dominates (requirement §25). */
export const SIMILARITY_WEIGHTS = {
  GENRE: 0.6,
  TAGS: 0.4,
} as const;

/** Personalized score blend (transparent, explainable — see docs/RECOMMENDATIONS.md). */
export const SCORE_WEIGHTS = {
  GENRE_MATCH: 3,
  TAG_MATCH: 2,
  PREFERENCE_MATCH: 2.5,
  BEHAVIOR_MATCH: 3,
  PURCHASE_SIMILARITY: 2,
  POPULARITY: 1,
  RECENCY: 0.5,
} as const;

/** Diversity guard: max games of one genre in a recommendation set. */
export const MAX_PER_GENRE = 3;

/** A game published within this window counts as "new" (discovery slot + recency boost). */
export const NEW_GAME_DAYS = 30;
