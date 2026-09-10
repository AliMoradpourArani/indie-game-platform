# Decisions (ADRs)

Record every important architectural choice here. Format: Decision / Context /
Options / Chosen / Why / Trade-offs / Future implications.

---

## ADR-001: Modular Monolith over microservices (Stage 0)

- **Context:** Team of one, local-first, unknown scale.
- **Options:** (a) Microservices, (b) Modular monolith, (c) Big ball of mud.
- **Chosen:** (b) Modular monolith with strict module APIs + layered internals.
- **Why:** One deployable, fast iteration, yet modules can be split later.
- **Trade-offs:** Single failure domain; must discipline imports.
- **Future:** Split only modules with independent scaling needs (see SCALE_PLAN).

## ADR-002: PostgreSQL as primary database

- **Context:** Relational domain (users, games, versions, submissions, purchases,
  entitlements) with integrity needs.
- **Options:** PostgreSQL / SQLite / MongoDB.
- **Chosen:** PostgreSQL 16 (local via Compose) + Prisma.
- **Why:** Integrity (FKs, unique), search (`ILIKE`→`trgm`), ecosystem, production path.
- **Trade-offs:** Requires Docker locally (documented fallback: direct install).
- **Future:** Pooling/replicas only when measured (Stage 2+).

## ADR-003: Game files outside the database

- **Context:** Large binaries (zips, builds, media).
- **Chosen:** Metadata in Postgres (`storageKey`, size, hash); bytes in file storage.
- **Why:** DB stays lean/backable; storage can move to S3+CDN transparently.
- **Future:** `S3StorageService` implements the same `StorageService` interface.

## ADR-004: Game / GameVersion / GameBuild / Submission are separate concepts

- **Context:** Updates over time + reviewable snapshots.
- **Chosen:** `Game` (evergreen) → `GameVersion` (snapshot) → `GameBuild` (artifact);
  `Submission` carries the review state machine per (game, version).
- **Why:** Correct update story; reviews attach to the right snapshot.
- **Trade-offs:** Slightly more tables; pays off from the first update.

## ADR-005: Explicit submission state machine (no boolean flags)

- **Context:** Review lifecycle with feedback loops.
- **Chosen:** `DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED|CHANGES_REQUIRED → PUBLISHED`
  (+ terminal `REJECTED`), transitions as pure functions + audit log.
- **Why:** Impossible states unrepresentable; history is first-class.
- **Future:** Extra states only with a recorded ADR.

## ADR-006: Infrastructure behind interfaces (storage, payments, mail, search, jobs)

- **Context:** Local-first now, cloud later.
- **Chosen:** Port/interface + local impl (`LocalStorageService`,
  `LocalTestPaymentProvider`, `LogMailer`, inline jobs, Postgres search).
- **Why:** Swap providers without touching business logic.
- **Trade-offs:** Small abstraction overhead; worth it.

## ADR-007: REST + versioning (`/api/v1`)

- **Context:** Frontend needs a stable contract.
- **Chosen:** REST with `/api/v1` prefix; OpenAPI from Phase 2.
- **Why:** Simplicity, tooling, cacheability; GraphQL unjustified at this scale.

## ADR-008: Backend stack — Node + TypeScript + Express + Prisma + Zod + Vitest

- **Context:** One language across stack, fast local dev, mature testing.
- **Options:** NestJS / Fastify / FastAPI (Python).
- **Chosen:** Express (minimal, well-known) + TS strict + Prisma + Zod + Vitest/Supertest.
- **Why:** Lowest complexity that meets modularity/testing needs; easy onboarding.
- **Trade-offs:** Express is unopinionated → we enforce layering by convention + reviews.
- **Future:** Fastify/NestJS migration only with measured justification.

## ADR-009: Frontend — Vite + React + TS + Tailwind + i18next

- **Context:** Premium game-store feel, RTL Persian, dark/light, responsive.
- **Options:** Next.js / Vite SPA / Remix.
- **Chosen:** Vite SPA.
- **Why:** Simplest local dev, no SSR ops burden in Stage 0; SEO via later prerender if needed.
- **Trade-offs:** SSR/SEO deferred; acceptable for an app-first store.
- **Future:** Re-evaluate Next.js only when SEO requirements demand it.

## ADR-010: Local-first docker-compose for Postgres; no cloud dependencies

- **Context:** No cloud infra available.
- **Chosen:** `docker-compose.yml` with Postgres 16; everything else in-process/local.
- **Why:** Reproducible one-command DB; zero external accounts.
