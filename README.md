# ◈ Indie Game Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38b2ac.svg)](https://tailwindcss.com/)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20%D9%81%D8%A7%D8%B1%D8%B3%DB%8C%20(RTL)-orange.svg)](frontend/src/i18n)

A modern, production-ready, open-source digital distribution platform and marketplace designed specifically for independent game developers and players. Built from the ground up as an evolvable **modular monolith** with clean layered architecture, local-first workflows, strict role-based access control (RBAC), and full bilingual support (English and Persian with complete RTL adaptation).

---

## 🌟 Highlights & Features

### 🎮 Player Discovery & Library Experience
* **Rich Game Discovery:** Filter by genre, tag, and search query with server-side pagination, instant sorting, and responsive grid layouts.
* **Personalized Recommendations:** Rule-based engine learns from onboarding taste anchors, game views, demo downloads, purchases, and ratings — with time decay, transparent scoring, genre diversity, and cold-start fallbacks (`Recommended for you` + `You might also like` rail). See [`docs/RECOMMENDATIONS.md`](docs/RECOMMENDATIONS.md).
* **First-Time Onboarding:** New registrants pick up to 5 well-known games to seed their taste profile (or skip); completion persists so it only ever shows once.
* **Full Game Showcases:** Comprehensive title pages featuring high-resolution screenshot galleries with interactive lightboxes, system requirements, changelogs, developer studio profiles, and verified status badges.
* **Community Feedback:** Interactive 5-star rating aggregates and verified player comments.
* **Frictionless Checkout & Free Claims:** One-click claims for free indie games, simulated payment gateway with idempotency protection, and instant discount codes (`WELCOME20`, `INDIE10`, `LAUNCH50`).
* **Personal Digital Library:** Track owned games and download builds securely via cryptographic HMAC-signed, time-limited token links.

### 🛠️ Developer Studio
* **Game Lifecycle Management:** Create and maintain game drafts with title, description, price, tags, and genres.
* **Semantic Versioning & Multi-Platform Builds:** Upload versioned game builds for Windows, Linux, macOS, and Web with SHA-256 integrity verification.
* **Media & Visual Assets:** Dedicated cover and screenshot asset management with live previews.
* **Editorial Review Workflow:** Submit versions for administrator approval, track state transitions (`DRAFT` → `PENDING_REVIEW` → `UNDER_REVIEW` → `APPROVED` / `CHANGES_REQUIRED` → `PUBLISHED`), and review moderation feedback.
* **Archive & Privacy Controls:** Soft-archive and unarchive games at will to control public storefront visibility.

### 🛡️ Administrator Moderation & Operations
* **Direct Access from Main Navigation:** Admins can access the dashboard directly from the top navigation bar and user menu.
* **Live Overview Metrics:** Track pending reviews, changes requested, published titles, registered studios, and total users in real time.
* **Moderation Queue:** Claim submissions, inspect builds, approve for storefront publication, or request changes with actionable developer feedback.
* **Storefront Management:** Archive, restore, or permanently delete games with mandatory justification modals and immutable audit logging.

### 🔒 Enterprise-Grade Security & Reliability
* **Strict RBAC Portals:** Strict separation between standard user/developer authentication (`/api/v1/auth/login`) and administrator portal (`/api/v1/auth/admin/login`).
* **Brute-Force Rate Limiting:** Windowed rate-limiting on credential endpoints with Draft-7 headers, exempting legitimate authenticated sessions.
* **Path-Traversal Safe Storage:** Safe local filesystem storage abstraction ready to swap for S3/GCS object storage without code changes.
* **HMAC Download Signing:** Direct download URLs expire automatically and prevent hotlinking.

### 🎨 Design System & Accessibility
* **Theme System:** Seamless Dark / Light mode switching with an animated sliding sun/moon toggle, pre-paint flash avoidance, and custom design tokens.
* **Bilingual English & Persian (فارسی):** Complete internationalization with contextual font scaling, bidirectional layout flipping, and Persian numerical typography.
* **Accessible Standards:** Keyboard navigation, accessible modal dialogs, focus rings, skip-to-content links, and `prefers-reduced-motion` compliance.

---

## 🏛️ Architecture & Monorepo Structure

The platform adopts a **Modular Monolith** architecture with layered separation of concerns (*Presentation → Application → Domain → Infrastructure*).

```text
indie-game-platform/
├── backend/                         # Express 4 + TypeScript modular monolith (API /api/v1)
│   ├── prisma/                      # Prisma schema, migrations, and test seed data
│   │   ├── migrations/              # Incremental SQL migrations
│   │   ├── schema.prisma            # Relational database domain model
│   │   └── seed.ts                  # Rich test data seeder (accounts, games, builds, reviews)
│   ├── src/
│   │   ├── modules/                 # Autonomous business modules
│   │   │   ├── admin/               # Administration metrics and audit queries
│   │   │   ├── auth/                # JWT auth, password hashing, RBAC middleware, rate limits
│   │   │   ├── downloads/           # HMAC download token issuance & file streaming
│   │   │   ├── feedback/            # Game comments and star rating aggregations
│ │   │   ├── games/               # Catalog discovery, developer studio CRUD, visual uploads
│ │   │   ├── purchases/           # Checkout, idempotency, discounts, library entitlements
│ │   │   ├── recommendations/     # Behavior events, taste profiles, rule-based scoring & feeds
│ │   │   ├── submissions/         # Moderation state machine & admin claim/review workflow
│   │   │   └── users/               # User profiles and studio verification
│   │   ├── infrastructure/          # Decoupled drivers (LocalStorageService, TestPaymentProvider)
│   │   ├── common/                  # AppError taxonomy, logging, security middleware
│   │   └── app.ts                   # Express application factory & middleware pipeline
│   └── tests/                       # Vitest unit & integration test suites
├── frontend/                        # Vite + React 18 + TypeScript + Tailwind CSS v4
│   ├── src/
│ │   ├── app/                     # Views & pages (Home, Browse, GamePage, Onboarding, Developer, Admin, Auth)
│   │   ├── design/                  # CSS tokens, theme switcher, modal dialogs, states
│   │   ├── i18n/                    # English (en) & Persian (fa) localization resources
│   │   ├── lib/                     # API client with typed errors and JSON parsing
│   │   └── main.tsx                 # Root application mount
│   └── vite.config.ts               # Vite proxy configuration (/api -> :4000)
├── docs/                            # Comprehensive architecture, security, and API documentation
├── storage/                         # Local asset & build repository (git-ignored)
├── docker-compose.yml               # Local PostgreSQL 16 service
└── LICENSE                          # MIT License & copyright notice
```

---

## 🚀 Quickstart & Local Setup

### Prerequisites
* **Node.js**: v20.x or later
* **npm**: v10.x or later
* **PostgreSQL**: Local instance or Docker (`docker compose up -d db`)

### 1. Database Setup
Ensure PostgreSQL is running locally on port 5432:
```bash
# If using Docker:
docker compose up -d db
```

### 2. Backend Setup
```bash
cd backend

# Copy environment configuration
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Seed default games, accounts, and discount codes
npm run db:seed

# Start backend server in development mode (:4000)
npm run dev
```

### 3. Frontend Setup
In a separate terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server (:5173 with API proxy to :4000)
npm run dev
```

Navigate your browser to **`http://localhost:5173`**.

---

## 🔑 Pre-Seeded Test Accounts

The database seed provides ready-to-test accounts across all platform roles:

| Role | Email | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@local.test` | `Admin1234!` | Storefront moderation, review queue, metrics dashboard, game deletion |
| **Developer** | `dev@local.test` | `Dev1234!` | Studio dashboard, create games, upload builds/media, submit for review |
| **Developer (Neon)** | `neon@local.test` | `Dev1234!` | Cyberpunk/Action game catalog developer |
| **Player** | `player@local.test` | `Player1234!` | Browse, play demos, purchase, claim games, download builds, rate & review |

### Active Promotional Discount Codes
* **`WELCOME20`** — 20% discount on any game
* **`INDIE10`** — 10% discount on any game
* **`LAUNCH50`** — 50% discount on any game

---

## 🎯 Default Included Showcase Games

The platform seeds 6 showcase indie games complete with artwork, versions, builds, and reviews:

1. **Lantern Drift** ($9.99, Adventure / Cozy / Exploration) — A serene water-drifting adventure through illuminated spirit archipelagoes.
2. **Cyber Neon 2088** ($14.99, Action / Cyberpunk / Synthwave) — High-octane slash-and-dash combat across the rain-drenched rooftops of Neo-Kyoto.
3. **Chrono Weaver** (Free / $0.00, Puzzle / Sci-Fi / Time-Manipulation) — Temporal paradox spatial puzzles manipulating temporal clones.
4. **Pixel Dungeon: Depths of Valdor** ($4.99, RPG / Roguelike / Pixel-Art) — Procedural tactical dungeon crawler with permadeath and dynamic potion crafting.
5. **Solaris Echoes** ($19.99, Strategy / Space / Simulation) — Manage an orbital station on the rim of an unstable dying star.
6. **Mystic Botanica** ($7.99, Casual / Relaxing / Simulation) — Cultivate magical flora in a greenhouse suspended between cloud realms.

---

## 🧪 Verification & Testing

The repository features comprehensive unit and integration test suites covering domain logic, auth cryptographic routines, RBAC boundaries, state transitions, and security surfaces:

```bash
# Run backend test suite
cd backend
npm test

# Check TypeScript typing across backend
npx tsc --noEmit

# Build production frontend bundle
cd ../frontend
npm run build
```

---

## 📡 Core API Summary

All endpoints are mounted under `/api/v1`:

| Area | Method & Path | Auth & Role | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET /health` | Public | Service health & timestamp |
| **Auth** | `POST /auth/register` | Public | Register new player or developer account |
| **Auth** | `POST /auth/login` | Public | Sign in player or developer account |
| **Auth** | `POST /auth/admin/login` | Public | Sign in administrator account (strict portal) |
| **Auth** | `GET /auth/me` | Bearer Token | Fetch current authenticated user & profile |
| **Discovery** | `GET /games` | Public | Browse published games with filter/sort |
| **Discovery** | `GET /games/:slug` | Public | Public game details, media, builds, comments |
| **Discovery** | `GET /genres` | Public | List genres with published titles |
| **Recommend** | `GET /preferences/games` | Public | Onboarding taste anchors (never purchasable) |
| **Recommend** | `GET\|POST /onboarding`, `POST /onboarding/skip` | Bearer Token | Taste-anchor selection & once-only gate |
| **Recommend** | `POST /events` | Bearer Token | Behavior tracking (purchase claims rejected) |
| **Recommend** | `GET /recommendations` | Optional auth | Personalized feed, cold-start fallback |
| **Recommend** | `GET /games/:slug/similar` | Optional auth | Similar-games rail |
| **Studio** | `GET /developer/games` | Developer | List developer's authored games |
| **Studio** | `POST /developer/games` | Developer | Create new game draft |
| **Studio** | `POST /developer/games/:id/versions` | Developer | Create new semantic version |
| **Studio** | `POST /developer/games/:id/media` | Developer | Upload cover or screenshot |
| **Studio** | `POST /developer/games/:id/archive` | Developer/Admin | Archive game from discovery |
| **Commerce** | `POST /purchases/checkout` | Player | Initiate purchase with discount code |
| **Commerce** | `POST /purchases/confirm` | Player | Confirm purchase and grant entitlement |
| **Library** | `GET /library` | Player | View purchased & claimed game entitlements |
| **Library** | `GET /library/:gameId/download/:buildId` | Player | Request signed HMAC download token |
| **Admin** | `GET /admin/overview` | Admin | Moderation and platform metrics |
| **Admin** | `GET /admin/submissions` | Admin | Pending review queue |
| **Admin** | `POST /admin/submissions/:id/review` | Admin | Approve or request changes |
| **Admin** | `DELETE /admin/games/:id` | Admin | Permanent deletion with audit logging |

---

## 📄 License & Copyright

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for complete details.

```text
Copyright (c) 2026 Ali Moradpour

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```
