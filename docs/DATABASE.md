# Database

PostgreSQL 16 via Prisma. **Game binaries never live in Postgres** — only metadata;
bytes live in file storage (local now, object storage later) keyed by `storageKey`.

## 1. Core principle: Game ≠ Version ≠ Submission

```text
Game               — evergreen metadata (title, slug, genre, tags, price, cover…)
 ├── GameVersion   — a releasable snapshot (1.0, 1.1…) + changelog + system reqs
 │     └── GameBuild — one platform artifact (windows/linux/…) → storageKey, size, hash
 └── Submission    — one review cycle for a (game, version); carries the state machine
       └── Review  — one admin decision + feedback (append-only history)
```

## 2. Submission state machine (no boolean soup)

```text
DRAFT → PENDING_REVIEW → UNDER_REVIEW → APPROVED → PUBLISHED
                              ↓              (publish action by dev after approval)
                        CHANGES_REQUIRED → DRAFT (→ PENDING_REVIEW …)
REJECTED is terminal for a submission (dev creates a new submission for a new version).
```

Allowed transitions (enforced in domain + DB check constraint intent):

| From             | To                              |
|------------------|---------------------------------|
| DRAFT            | PENDING_REVIEW                  |
| PENDING_REVIEW   | UNDER_REVIEW, DRAFT (withdraw)  |
| UNDER_REVIEW     | APPROVED, CHANGES_REQUIRED, REJECTED |
| CHANGES_REQUIRED | DRAFT                           |
| APPROVED         | PUBLISHED, DRAFT (new edits reset) |
| PUBLISHED        | (new version → new submission cycle; game stays published) |

Every transition writes an `AuditLog` row; admin decisions also write a `Review` row.

## 3. Tables (Stage 0 scope; Prisma schema is authoritative)

```text
User(id, email unique, passwordHash, role: PLAYER|DEVELOPER|ADMIN, status, createdAt)
Profile(userId unique, displayName, avatar, bio, locale, theme)
DeveloperProfile(userId unique, studioName, website, verified)

Game(id, slug unique, title, description, genre, tags[], priceCents, currency,
     coverKey, status: derived from latest submission, developerId → User, createdAt)
GameVersion(id, gameId, version SemVer-ish, changelog, requirements JSON, createdAt)
GameBuild(id, versionId, platform: WINDOWS|LINUX|MAC|WEB, storageKey, sizeBytes,
          sha256, demo: boolean)
GameMedia(id, gameId, kind: SCREENSHOT|TRAILER|COVER, storageKey, order)

Submission(id, gameId, versionId, state, submittedBy, createdAt, updatedAt)
Review(id, submissionId, reviewerId → admin, decision: APPROVED|CHANGES_REQUIRED|REJECTED,
       comment, createdAt)  # append-only

Purchase(id, buyerId, gameId, amountCents, currency, status: PENDING|COMPLETED|FAILED|REFUNDED,
         providerRef unique, idempotencyKey unique, createdAt)
Entitlement(id unique(userId, gameId), userId, gameId, purchaseId, grantedAt)  # library access
DownloadToken(id, userId, buildId, expiresAt, usedAt?)  # controlled access

AuditLog(id, actorId?, action, entityType, entityId, diff JSON, ip?, createdAt)
```

Notes:
- `Entitlement` (library access) is separate from `Purchase` (money event). Exactly one
  entitlement per (user, game); purchases are append-only (refunds don't delete history).
- Prices in minor units (`priceCents`) + `currency`; free games = `0`.
- `storageKey` format: `games/<gameId>/<version>/<platform>/<filename>` — generated
  server-side; never trust client paths (path-traversal defense).

## 4. Migrations & seeds

- Migrations: `npx prisma migrate dev` locally; review SQL before commit.
- Seed (`prisma/seed.ts`, dev only): admin + developer + player accounts, sample genres,
  2–3 example games with versions/builds pointing at placeholder files, one submission
  per state for admin-queue testing. Credentials documented in `LOCAL_SETUP.md` only.

## 5. Future evolution (no action now)

- `pg_trgm` index on `Game.title/description` when DB search needs relevance.
- Read replica + PgBouncer in Stage 2/3; `GameView`/analytics tables only with measured need.
