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

## Phase 2 — Authentication ✅

- [x] Register (PLAYER/DEVELOPER choice; ADMIN never via public endpoint), login, logout, me/profile
- [x] Password hashing (bcryptjs cost 12; argon2 upgrade path behind `password.ts`), JWT, RBAC guards (backend-enforced)
- [x] Separate admin login (`/admin/login`) + `requireAdmin` guard; UI refuses non-admins, API enforces
- [x] Tests: unit (hash/JWT/validation, 4 new) + DB-gated integration journey
      (register→login→me→logout, duplicate 409, developer profile) — runs with `TEST_DATABASE_URL`
- [x] Frontend: AuthProvider, login/register/admin pages, role-aware nav, en/fa strings

## Phase 3 — Game Domain ✅

- [x] Games CRUD (drafts), metadata (genre/tags/price), Zod validation
- [x] `Game` ≠ `GameVersion` ≠ `GameBuild`; versions (loose semver) + per-platform builds
- [x] Local uploads via `StorageService` (multer memory → `LocalStorageService`);
      magic-byte sniffing, MIME allowlist, size caps, traversal-safe keys
- [x] Ownership enforced on every write; edit blocked outside editable review states
- [x] Public detail publish-gated (404 until a PUBLISHED submission exists)
- [x] Tests: unit (slug/version/sniff/validation) + DB-gated integration journey
- [x] Frontend: developer dashboard (list + states, create draft, versions)

## Phase 4 — Submission & Review ✅

- [x] State-machine transitions API (submit/withdraw/claim/review/publish) with
      `assertTransition` + per-transition audit rows
- [x] Admin login (Phase 2) + dashboard (overview counts, review queue, review
      detail with claim/approve/request-changes/reject + comment, history + audit trail)
- [x] Developer feedback view (latest submission + admin reviews) + resubmit loop
- [x] Tests: RBAC unit + full-cycle DB-gated integration (submit→claim→changes→
      withdraw→resubmit→approve→publish→public visible→history/audit)
- [x] Frontend: submission panel on game detail, admin dashboard + review pages (en/fa)

## Phase 5 — Public Game Platform ✅

- [x] Homepage (hero + newest games, live backend status)
- [x] Discovery API: `GET /games` (published-only, search/genre/tag/sort/pagination),
      `GET /genres`, publish-gated `GET /games/:slug` (+studio), `GET /developers/:id`
- [x] Frontend: browse (search + filters), game detail (media/requirements/versions/demo+buy),
      developer profile pages; responsive card grids
- [x] Purchase/library buttons present but inert (wired in Phase 6)

## Phase 6 — Purchases & Library ✅

- [x] Checkout (idempotent via `Idempotency-Key`) + confirm (provider-verified,
      never frontend-declared) + free-game instant grant
- [x] Entitlements separate from purchases (`userId+gameId` unique; refunds revoke
      access, history preserved); every grant audit-logged
- [x] Library API + controlled downloads: demos open on published games, full
      builds entitlement-gated, short-lived HMAC tokens, bytes stream from
      storage (never a public dir)
- [x] Tests: provider idempotency unit + DB-gated journey (deny→demo→checkout→
      retry→confirm→library→allow, free grant)
- [x] Frontend: purchase/claim flow on game page, library with per-platform downloads

## Phase 7 — UI/UX Refinement

- Design system pass, loading/empty/error states, a11y, theme polish, full en/fa

## Phase 8 — Testing & Security

- Unit + integration + E2E (submission cycle, purchase→library→download),
  security review per `SECURITY.md`

## Phase 9 — Production Readiness (only when local is stable)

- Prod config, backup/restore drills, object-storage swap, CDN plan, runbooks.
- No cloud deploy unless explicitly requested.
