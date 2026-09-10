# Indie Game Platform

A modern, local-first platform for independent game developers — connecting **players**,
**developers**, and **administrators** in one clean, evolvable system.

> **Status:** Phase 0 — Project Foundation (see `docs/PROJECT_STATUS.md`).
> **Architecture:** Modular Monolith + Clean/Layered Architecture.
> **Local-first:** runs fully offline; cloud services (S3, Stripe, etc.) are behind
> abstractions and introduced only when needed (see `docs/SCALE_PLAN.md`).

## Quick start (local)

```bash
git clone https://github.com/AliMoradpourArani/indie-game-platform.git
cd indie-game-platform

# 1. Start PostgreSQL
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env        # adjust DATABASE_URL if needed
npm install
npx prisma migrate dev
npm run db:seed
npm run dev                 # http://localhost:4000/api/v1/health

# 3. Frontend (new terminal)
cd ../frontend
npm install
npm run dev                 # http://localhost:5173
```

Details: `docs/LOCAL_SETUP.md`.

## Repository layout

```text
indie-game-platform/
├── docs/                  # Architecture, plans, decisions, status (source of truth)
├── backend/               # Express + TypeScript modular monolith (API /v1)
│   ├── prisma/            # Prisma schema, migrations, seed
│   └── src/
│       ├── modules/       # Auth, Users, Games, Submissions, Purchases, Admin, ...
│       └── infrastructure/# Storage, Payments, Email (local impls behind interfaces)
├── frontend/              # Vite + React + TS + Tailwind + i18next (en/fa, RTL)
├── docker-compose.yml     # Local PostgreSQL (+ optional pgAdmin)
└── storage/               # Local file storage root (git-ignored)
```

## Documentation (read in this order)

1. `docs/PROJECT_STATUS.md` — what is done, what is next
2. `docs/SCALE_PLAN.md` — how the system evolves Stage 0 → 3 (read before every phase)
3. `docs/ARCHITECTURE.md` — modular monolith, layers, modules
4. `docs/DEVELOPMENT_PLAN.md` — phases 0–9
5. `docs/DATABASE.md` — domain model, game/version/submission separation
6. `docs/API.md` — REST `/api/v1` contracts
7. `docs/SECURITY.md` — threat model & rules
8. `docs/DECISIONS.md` — ADRs
9. `docs/TESTING.md` — test strategy
10. `docs/LOCAL_SETUP.md` — environment setup

## Roles & flows (summary)

- **Player:** register → browse → demo → purchase → library → download.
- **Developer:** register → profile → create game → draft → version → submit →
  feedback → resubmit → approval → publish.
- **Admin:** footer `Admin` link → `/admin/login` → dashboard → review queue →
  approve / request changes (+ feedback history).

Game state machine: `DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED|CHANGES_REQUIRED → PUBLISHED`
(see `docs/DATABASE.md`).

## Tech stack (why: `docs/DECISIONS.md`)

| Layer    | Choice                                   |
|----------|------------------------------------------|
| Backend  | Node.js + TypeScript + Express + Prisma  |
| Database | PostgreSQL 16 (local via Docker)         |
| Frontend | Vite + React + TS + Tailwind + i18next   |
| Tests    | Vitest + Supertest (backend), Playwright (later E2E) |
| Storage  | `StorageService` → `LocalStorageService` (S3 later) |
| Payments | `PaymentProvider` → `LocalTestPaymentProvider` (real PSP later) |

## Contributing / Git workflow

- After every meaningful task: inspect → test → review diff → update docs →
  meaningful commit (`feat:`, `fix:`, `docs:`, ...) → push.
- Never commit secrets, `.env` with secrets, or large binaries.

## License

TBD — will be decided before any public game content is hosted.
(Recommended: code under MIT/Apache-2.0; game assets remain property of their developers.)
