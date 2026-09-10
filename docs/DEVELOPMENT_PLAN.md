# Development Plan — Phases 0–9

Each phase ends with: tests run → app builds → docs + `PROJECT_STATUS.md` updated →
reviewed diff → **meaningful commit → push**. Report in the format defined in the
project brief (§48). Never claim completion with missing parts.

## Phase 0 — Project Foundation ✅ (this commit)

- [x] GitHub repo + local dir (same name) + git init
- [x] `docs/` control system (10 files), README, `.gitignore`, `.env.example`
- [x] `docker-compose.yml` (Postgres 16), initial monorepo layout
- [ ] First commit + push

## Phase 1 — Architecture & Infrastructure (next)

- [ ] Backend skeleton: Express+TS app factory, `/api/v1/health`, config+Zod,
  pino logging, error middleware, rate limit, security headers
- [ ] Prisma schema (users + games core), first migration, seed script
- [ ] `StorageService`/`LocalStorageService`, `PaymentProvider`/`LocalTestPaymentProvider`,
  `Mailer`/`LogMailer`, `JobQueue` inline
- [ ] Vitest + Supertest harness, first unit tests (state machine pure functions)
- [ ] Frontend skeleton: router, theme (dark/light), i18n (en/fa + RTL), API client,
  public layout + footer `Admin` link, `/admin/login` placeholder
- [ ] `npm run dev` for both apps documented and verified

## Phase 2 — Authentication

- Register (PLAYER/DEVELOPER choice), login, logout, me/profile
- Password hashing (argon2/bcrypt), JWT, RBAC guards (backend-enforced)
- Separate admin login (`/admin/login`) + admin guard
- Tests: auth integration (register→login→guarded route→logout)

## Phase 3 — Game Domain

- Games CRUD (drafts), metadata (genre/tags/requirements/price), media metadata
- `Game` ≠ `GameVersion` ≠ build files; local uploads via `StorageService`
- Validation (file type/size, path-traversal safe keys)

## Phase 4 — Submission & Review

- Submission state machine + transitions API, admin review queue + feedback,
  resubmit flow, review history, audit logging

## Phase 5 — Public Game Platform

- Homepage, featured/new/popular, categories, search+filters, game pages,
  developer profiles, responsive UI

## Phase 6 — Purchases & Library

- Orders + local test payments (idempotent, backend-verified), entitlements,
  library, controlled downloads (signed local tokens)

## Phase 7 — UI/UX Refinement

- Design system pass, loading/empty/error states, a11y, theme polish, full en/fa

## Phase 8 — Testing & Security

- Unit + integration + E2E (submission cycle, purchase→library→download),
  security review per `SECURITY.md`

## Phase 9 — Production Readiness (only when local is stable)

- Prod config, backup/restore drills, object-storage swap, CDN plan, runbooks.
- No cloud deploy unless explicitly requested.
