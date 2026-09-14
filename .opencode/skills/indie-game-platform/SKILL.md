---
name: indie-game-platform
description: Working context for the Indie Game Platform monorepo (Express+Prisma backend, Vite+React frontend). Load before any code task to skip full project re-read.
---

## What I do

Load this instead of re-reading the whole repo. Covers layout, stack, workflows, conventions, and key files for the Indie Game Platform.

## When to use me

Use automatically on any task touching `backend/`, `frontend/`, `docs/`, `docker-compose.yml`, or `storage/` in this repo.

## Repository layout

```text
indie-game-platform/
├── docs/ (ARCHITECTURE, SCALE_PLAN, DEVELOPMENT_PLAN, DATABASE, API, SECURITY, DECISIONS, TESTING, LOCAL_SETUP, PROJECT_STATUS — source of truth)
├── backend/ (Express+TS modular monolith, API /api/v1; prisma/schema.prisma, seed; src/modules/*, src/infrastructure/*)
├── frontend/ (Vite+React+TS+Tailwind v4+i18next en/fa RTL; src/app/*, src/lib/api.ts, src/design/tokens.css, src/i18n/*/common.json)
├── docker-compose.yml (Postgres 16 local), storage/ (local files, git-ignored)
```

## Quick commands

```bash
# DB (needs Docker)
docker compose up -d db
cd backend; cp .env.example .env; npm install; npx prisma migrate dev; npm run db:seed; npm run dev  # :4000/api/v1/health
cd ../frontend; npm install; npm run dev  # :5173 (proxies /api -> :4000)
# Verify (no Docker needed)
cd backend; npm test; npx tsc --noEmit
cd ../frontend; npm run build  # tsc --noEmit + vite build
```

## Architecture (must respect)

- Backend: modular monolith, layered `routes.ts -> service.ts -> domain.ts -> infrastructure/*`. Mounted in `backend/src/app.ts` under `/api/v1`. Central errors `src/common/errors.ts` (`AppError{code,status}`), mapped in `src/common/middleware.ts` (`errorHandler`, `notFound` last). Never throw plain `Error` — use `Errors.*`.
- Auth: single `POST /auth/login|register` (no separate admin endpoint). JWT `{sub,role}` Bearer. `requireAuth`, `requireRole`, `requireAdmin`, `requireDeveloper (=DEVELOPER+ADMIN)`. `ADMIN` only via seed (`admin/dev/player@local.test`). Frontend additionally guards routes client-side but backend is authoritative.
- Game lifecycle: `Game -> GameVersion -> GameBuild (+demo flag) + GameMedia; Submission{gameId,versionId,state} + Review{decision,comment}` (admin feedback). States: `DRAFT -> PENDING_REVIEW -> UNDER_REVIEW -> APPROVED|CHANGES_REQUIRED (+REJECTED) -> PUBLISHED`. Discovery is publish-gated (`browseGames`, `getPublicGame` 404 unless latest==PUBLISHED).
- Storage: `StorageService -> LocalStorageService` (`buildGameKey`, traversal-safe). Uploads via `multer` memory. Payments: `PaymentProvider -> LocalTestPaymentProvider` (idempotent by `Idempotency-Key`; free games complete instantly). Downloads: HMAC `/files/:token`, demo needs JWT, full needs entitlement.
- DB: 13 Prisma models (`User/Profile/DeveloperProfile/Game/GameVersion/GameBuild/GameMedia/Submission/Review/Purchase/Entitlement/DownloadToken/AuditLog`). No `Comment/Rating/Discount/Game.status` yet — adding them needs a Prisma migration + service + routes + frontend. Docs say game status is derived from latest submission.

## Frontend conventions (must follow)

- Routing (`src/app/router.tsx`, `createBrowserRouter`): `PublicLayout` (`/`, `/browse`, `/games/:slug`, `/developers/:id`, `/library`, `/developer`, `/developer/games/:id`, `/login`, `/register`, `/about|rules|privacy|terms`); `AdminLayout` (`/admin/login`, `/admin`, `/admin/submissions/:id`). No `*`/404 route, no `ErrorBoundary`, no `/purchase` route yet.
- Styling: Tailwind v4 (`@import "tailwindcss"` in `tokens.css`, `@custom-variant dark`). Colors ONLY via CSS vars in `src/design/tokens.css` (`--bg/bg-raised/bg-sunken/ink/ink-muted/line/accent/accent-ink/accent-soft/danger/radius`, `[data-theme=dark]` overrides). Layout via Tailwind, `.surface`/`.btn-accent` for components. Never hardcode colors.
- i18n: `i18next+react-i18next`, `src/i18n/config.ts` (`applyLocale` sets `html lang/dir`, persists `locale`), locales `src/i18n/en|fa/common.json` (namespaces `nav/hero/footer/admin/auth/theme/lang/common/placeholder/health/home/browse/game/library/dev/adminS`). Every user string needs en+fa entries; fa is RTL (`[dir=rtl] line-height:1.9`).
- Theme: `src/app/useTheme.ts` (`localStorage.theme` or `prefers-color-scheme`, sets `documentElement.dataset.theme`). Current UI is a text button in `Controls()` (`src/app/layouts.tsx`).
- API client (`src/lib/api.ts`): `apiGet/apiPost` + `ApiError{status,path,message}`. No PUT/PATCH/DELETE/upload helpers — add as needed. `GamePage.purchase` currently uses raw `fetch` with `Idempotency-Key: crypto.randomUUID()`.
- Shared UI (`src/design/states.tsx`): `Loading/Empty/ErrorNote` (inline only — no global toast/modal yet). All dropdowns are native `<select class="surface">` (browse filters, locale, role). Media/covers are `◈` placeholders (`coverKey/storageKey` never rendered as `<img>`).
- Key files per task: error UX → `design/states.tsx`, `authPages.tsx`, `games.tsx:GamePage`, `admin.tsx:AdminSubmissionDetail`, `developer.tsx`; admin nav → `layouts.tsx:AdminLayout`, `authPages.tsx:AdminLoginPage`, `admin.tsx`; lang/dropdown/theme → `layouts.tsx:Controls`, `useTheme.ts`, `tokens.css`; game page/purchase → `games.tsx`, `router.tsx`, `purchases/*`; role separation → `auth/service.ts|middleware.ts|routes.ts`, `auth.tsx`, `authPages.tsx`; archive/delete → `games/service.ts|routes.ts`, `submissions/*`, `discovery.ts`, `schema.prisma`, `developer.tsx`, `admin.tsx`; image upload → `games/uploads.ts|service.ts|routes.ts`, `developer.tsx`.

## Backend endpoints (implemented)

`GET /health|/ready`, `POST /auth/register|login|logout`, `GET /auth/me|/users/me`, `GET /games?search&genre&tag&sort&page&pageSize|/genres|/games/:slug|/developers/:id`, `POST|GET /developer/games`, `PATCH /developer/games/:id`, `POST /developer/games/:id/versions|/media`, `POST /developer/versions/:vid/builds`, `POST /developer/games/:id/submit|/publish`, `POST /developer/submissions/:id/withdraw`, `GET /developer/games/:id/submission`, `GET /admin/submissions?state|/overview|/audit`, `POST /admin/submissions/:id/claim|/review`, `GET /admin/submissions/:id/history`, `POST /purchases/checkout|/confirm`, `GET /library|/library/:gameId/download/:buildId|/files/:token`.

## Rules

- After meaningful work: inspect → test (`backend npm test`, `tsc`, `frontend npm run build`) → review diff → update `docs/PROJECT_STATUS.md` if behavior changes → commit `feat:|fix:|docs:` → push only when asked.
- Never commit secrets, `.env`, large binaries. Seed creds are dev-only.
- Keep responsive (mobile hamburger nav exists), accessible (skip-link, focus rings, `prefers-reduced-motion`), and bilingual (en+fa) for every UI string.
