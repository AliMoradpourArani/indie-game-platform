# Project Status (living document — update every phase)

> Agent loop: read THIS + `SCALE_PLAN.md` + `ARCHITECTURE.md` first, every phase.

## Current

- **Phase:** 7 — UI/UX Refinement ✅ → moving to Phase 8 (Testing & Security)
- **Date:** 2026-09-10
- **Repo:** https://github.com/AliMoradpourArani/indie-game-platform
- **Stack (decided, ADR-008/009):** Backend Node+TS+Express+Prisma+Postgres;
  Frontend Vite+React+TS+Tailwind+i18next
- **Architecture:** Modular monolith, layered (Presentation→Application→Domain→Infrastructure)

## Completed

- [x] GitHub repo created (`indie-game-platform`, public)
- [x] Local dir `indie-game-platform/` (mirrors repo name)
- [x] `docs/` control system (10 files: ARCHITECTURE, SCALE_PLAN, DEVELOPMENT_PLAN,
      DATABASE, API, SECURITY, DECISIONS, TESTING, LOCAL_SETUP, PROJECT_STATUS)
- [x] README, `.gitignore`, `.env.example`, `docker-compose.yml` (Postgres 16)
- [x] Initial monorepo layout (`backend/`, `frontend/`, `storage/`)
- [x] Phase 1: backend skeleton (Express app factory, `/api/v1/health|ready`,
      Zod env config, pino logging, helmet/CORS/rate-limit, central error map)
- [x] Phase 1: Prisma schema (13 models) validated + migration SQL rendered +
      client generates; seed script written
- [x] Phase 1: `StorageService`/`LocalStorageService` (traversal-safe keys),
      `PaymentProvider`/`LocalTestPaymentProvider` (idempotent),
      `LogMailer`, `InlineJobRunner`, HMAC download tokens
- [x] Phase 1: 13/13 backend tests green (state machine, entitlements, storage
      keys, download tokens, health); `tsc` clean; server boots, health 200
- [x] Phase 1: frontend shell builds + serves 200 (router, theme dark/light,
      i18n en/fa + RTL, public layout + footer Admin link, `/admin/login`)
- [x] Phase 2: auth backend (register/login/logout/me, bcrypt-12, JWT, Zod 422 map,
      requireAuth/requireRole/requireAdmin, auth rate-limit) + frontend
      (AuthProvider, login/register/admin pages, role-aware nav, en/fa auth strings)
- [x] Phase 2: 17/17 runnable backend tests green (2 DB journey tests skip without
      `TEST_DATABASE_URL`); `tsc` clean; both apps build
- [x] Phase 3: games module (draft CRUD, versions, builds, media uploads with
      sniffing; ownership + edit-state guards; publish-gated public detail)
- [x] Phase 3: 22/22 runnable backend tests green (4 DB journey tests skip);
      both apps build clean
- [x] Phase 4: submission service (submit/withdraw/claim/review/publish + audit),
      admin overview/queue/history endpoints, developer feedback endpoint
- [x] Phase 4: 24/24 runnable backend tests green (5 DB journey tests skip:
      auth 2, games 2, full review cycle 1); both apps build clean
- [x] Phase 4: frontend submission panel + admin dashboard/review pages (en/fa)
- [x] Phase 5: discovery API (browse/genres/published detail/dev profile) +
      frontend home/browse/game/developer pages with responsive cards
- [x] Phase 5: 25/25 runnable backend tests green (5 DB journey tests skip);
      both apps build clean
- [x] Phase 6: purchases (idempotent checkout, provider-verified confirm, free
      grant), entitlements, library, controlled HMAC downloads
- [x] Phase 6: 25/25 runnable backend tests green (7 DB journey tests skip);
      both apps build clean
- [x] Phase 6: frontend purchase/claim + library downloads (en/fa)
- [x] Phase 7: shared ARIA states, responsive mobile nav, skip link, focus rings,
      reduced-motion, theme pre-paint, i18n audit — frontend builds clean

## In progress

- Phase 8 scaffolding: testing & security review (matrix, upload fuzz, headers, audit)

## Broken / blockers

- None. Local live-DB run deferred by owner decision (2026-09-10): migrations/seed
  are validated via `prisma validate` + `migrate diff`; live run via
  `docker compose up -d db` on a machine with Docker. No Docker/Postgres/winget
  server package in this environment.

## Next recommended task

1. Finish Phase 1 backend skeleton and verify `GET /api/v1/health` + `npm test` green.
2. Then Phase 1 frontend shell and verify `npm run dev` on both apps.
3. Commit as `feat: phase 1 architecture and infrastructure foundation`.

## Git

- Latest commit: (to be recorded after Phase 0 push)
- Branch: `main`, remote `origin` → GitHub (push after each phase)
