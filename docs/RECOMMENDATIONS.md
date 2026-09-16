# Recommendations & Discovery

Personalized game discovery: onboarding taste anchors, behavior tracking,
rule-based scoring, homepage feed, and similar-games carousel.

## 1. Architecture

New `recommendations/` module inside the existing modular monolith
(`backend/src/modules/recommendations/`). It owns ALL scoring logic;
games/homepage/purchases/library only supply signals.

```text
recommendations/
├── preferenceGames.ts  # external taste anchors (static catalog, NOT Game rows)
├── weights.ts          # central scoring config (tune without migrations)
├── domain.ts           # pure engine: decay, profile, similarity, scoring,
│                       # ranking, diversity + RecommendationStrategy port
├── service.ts          # Prisma use-cases (candidates → filter → score → rank)
├── validation.ts       # Zod boundary schemas
└── routes.ts           # REST endpoints (mounted under /api/v1)
```

Pipeline: `behavior + preferences + purchases + popularity → candidates →
filtering → scoring → ranking (+diversity) → frontend`.

Frontend (`frontend/src/app/onboarding.tsx`, `recommendations.tsx`) only
renders, tracks events, and handles loading/empty/error states.

## 2. Event model

`UserEvent(userId, eventType, gameId?, metadata?, createdAt)`. Only behavior
the product actually supports — no fake cart/wishlist (those models don't
exist; reserved weights documented in `weights.ts`):

| Event | Weight | Source |
|---|---|---|
| `GAME_VIEWED` | 1 | game page open |
| `GAME_VIEW_REPEATED` | 2.5 | view within 24h of a prior view (server upgrade) |
| `RECOMMENDATION_CLICKED` | 1.5 | reco card click |
| `GAME_OPENED_FROM_RECOMMENDATION` | 2 | game page opened via `?src=reco` |
| `DEMO_DOWNLOADED` | 4 | demo download success |
| `GAME_PURCHASED` | 5 | checkout/confirm (server-side, best-effort) |
| onboarding selection (derived) | 3 | `/onboarding` picks |
| high rating ≥ 4 (derived) | 2 | existing `GameRating` rows |

All weights live in `weights.ts` — tuning needs no migration.

## 3. Time decay

`decayed = base × 0.5^(ageDays / 30)` — exponential half-life of 30 days
(`HALF_LIFE_DAYS`). Simple, explainable, per-signal.

## 4. Interest profile

`buildInterestProfile(signals)` aggregates decayed genre/tag weights,
normalized to 0..1. Computed dynamically per request (current scale);
the `RecommendationStrategy` port allows a precomputed profile later.

## 5. Onboarding (cold-start fix)

- `GET /preferences/games` → 12 static external anchors (name + emoji art +
  genres/tags). Never `Game` rows, never purchasable, never in discovery.
- New registrants land on `/onboarding`; `Profile.onboardingCompleted /
  onboardingSkipped` persist the once-only gate.
- `POST /onboarding {externalGameIds: 0–5}` / `POST /onboarding/skip`.

## 6. Candidate generation → filtering → scoring → ranking

Candidates: (1) games similar to viewed/purchased, (2) profile matches,
(3) popular, (4) new. Filtered: owned/entitled, archived, unpublished,
current game. Scored (`RuleBasedStrategy`):

```text
score = 3.0×genreMatch + 2.0×tagMatch + 1.0×popularity + 0.5×recency
```

Ranked deterministically (score → popularity → recency), then diversified
(max 3 per genre, discovery slot for new/adjacent games).

Similarity (`contentSimilarity`): same genre = 0.6, tag Jaccard = 0.4 —
same-genre always outranks unrelated genres.

## 7. Cold start

- **A — brand-new/anonymous:** popular → newest.
- **B — onboarding done:** preference signals + genre/tag similarity.
- **C — active:** full behavior + purchases + ratings + profile.
Response carries `mode: personalized | cold-start` so the UI can adapt.

## 8. Explanations

`reason` is only set when the score supports it ("Because you enjoy X
games", "Shares tag,…", "New release…") — never fabricated.

## 9. API

```text
GET  /preferences/games
GET  /onboarding / POST /onboarding / POST /onboarding/skip   (auth)
POST /events {type, gameId?, metadata?}                        (auth)
  # GAME_PURCHASED is rejected from browsers; the purchases module emits it
  # server-side from trusted tables (§51).
GET  /recommendations?limit=10                                 (optional auth)
GET  /games/:slug/similar?limit=8                              (optional auth)
```

Purchase ownership always comes from server tables — client claims are
never trusted (§51). Event tracking failures never break money flows.

## 10. Privacy & performance

Only recommendation-necessary signals are stored; no raw behavior is
exposed to clients. Recommendations compute per request over the published
catalog (cheap at current scale); the module boundary allows adding a
cache or `RecommendationSnapshot` later without changing the public API.

## 11. Future (staged, not built)

`RecommendationStrategy` port → content-based v2 → collaborative filtering
→ hybrid ML. Stage triggers live in `SCALE_PLAN.md`; no Redis/Kafka/ES/ML
infra until measured need.
