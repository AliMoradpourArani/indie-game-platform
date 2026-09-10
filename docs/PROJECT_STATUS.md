# Project Status (living document — update every phase)

> Agent loop: read THIS + `SCALE_PLAN.md` + `ARCHITECTURE.md` first, every phase.

## Current

- **Phase:** 1 — Architecture & Infrastructure ✅ → moving to Phase 2 (Authentication)
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

## In progress

- Phase 2 scaffolding: authentication (register/login/logout, RBAC, admin guard)

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
