# Architecture

> Read with: `SCALE_PLAN.md`, `DECISIONS.md`, `DATABASE.md`, `API.md`.
> Before every major phase, re-read `SCALE_PLAN.md` first.

## 1. Application architecture: Modular Monolith

One deployable backend process, internally split into strict modules with
explicit public APIs. Modules communicate only through those APIs — never by
reaching into another module's tables or internals. This lets any module become
an independent service later **without rewriting business logic**.

```text
                    ┌───────────────────────┐
                    │       Frontend        │
                    │  Player / Developer   │
                    │       / Admin         │
                    └───────────┬───────────┘
                                │ REST /api/v1
                    ┌───────────▼───────────┐
                    │      Backend API      │
                    │    Modular Monolith   │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Application Layer   │  use-cases, orchestration, DTOs
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Domain Layer      │  entities, state machines, policies
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Infrastructure Layer  │  Prisma, storage, payments, email
                    └───────┬────────┬──────┘
                            │        │
                    ┌───────▼───┐ ┌──▼────────────┐
                    │PostgreSQL │ │ Local Storage │
                    └───────────┘ └───────────────┘
```

## 2. Layer rules (enforced by folder structure + imports)

| Layer          | Location (backend)              | May depend on              | Must NOT depend on          |
|----------------|---------------------------------|----------------------------|-----------------------------|
| Presentation   | `src/modules/*/routes.ts`, `src/app.ts` | Application          | Domain internals, Prisma, fs |
| Application    | `src/modules/*/service.ts`, `dto.ts`    | Domain, ports (interfaces) | Express req/res, Prisma, fs |
| Domain         | `src/modules/*/domain.ts`, `policy.ts`  | Nothing (pure)       | Anything infrastructural    |
| Infrastructure | `src/infrastructure/*`, `prisma/*`      | Application ports    | Domain must not import here |

**Dependency rule:** dependencies point inward. Infrastructure implements
interfaces (ports) defined in Application/Domain.

## 3. Modules

```text
backend/src/modules/
├── health/        # liveness, readiness (no auth)
├── auth/          # register, login, logout, sessions/tokens, RBAC guards
├── users/         # player/developer/admin profiles (account data)
├── games/         # game metadata, genres, tags, media links
├── gameVersions/  # version 1.0/1.1 + per-platform builds (files live in storage)
├── submissions/   # state machine: DRAFT → … → PUBLISHED, review history
├── reviews/       # player ratings/reviews of PUBLISHED games (later phase)
├── purchases/     # orders + LocalTestPaymentProvider
├── library/       # entitlements derived from successful purchases
├── downloads/     # controlled file access (signed local tokens now, S3 later)
├── media/         # cover/screenshot/trailer metadata + validation
├── admin/         # moderation queues, user/game management, audit viewer
├── notifications/ # interface only in Stage 0 (log-based impl)
└── audit/         # append-only log of sensitive actions
```

Do not add new modules to "look complete". A module earns existence when it owns
distinct domain rules or data.

## 4. Infrastructure abstractions (replaceable without touching business logic)

```ts
// Storage
interface StorageService {
  save(key: string, data: Buffer | NodeJS.ReadableStream, mime: string): Promise<StoredFile>;
  get(key: string): Promise<NodeJS.ReadableStream>;
  delete(key: string): Promise<void>;
  createDownloadAccess(key: string, opts: { expiresInSec: number; userId: string }): Promise<string>;
}
// Stage 0: LocalStorageService (./storage). Future: S3StorageService.

// Payments
interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<Checkout>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>; // never trust frontend
}
// Stage 0: LocalTestPaymentProvider (simulated, idempotent). Future: StripePaymentProvider.

// Email / Notifications
interface Mailer { send(to: string, template: string, data: unknown): Promise<void>; }
// Stage 0: LogMailer. Future: SMTP / transactional provider.

// Search
interface SearchService { searchGames(q: Query): Promise<Game[]>; }
// Stage 0: PostgresSearchService (ILIKE + trigram later). Future: Meilisearch/OpenSearch.

// Jobs
interface JobQueue { enqueue(name: string, payload: unknown): Promise<void>; }
// Stage 0: InlineJobRunner (synchronous). Future: BullMQ + Redis.
```

Frontend never talks to the DB or storage directly — always `Frontend → REST → Application → Domain → Infrastructure`.

## 5. Frontend architecture

Vite + React + TypeScript + React Router + Tailwind + i18next.

```text
frontend/src/
├── app/            # router, providers (theme, i18n, auth), layouts
├── design/         # tokens (CSS vars), primitives (Button, Card, Input, Modal…)
├── features/       # player, developer, admin, games, library, … (per-route slices)
├── lib/            # api client, auth storage, download helpers
└── i18n/           # en/ + fa/ namespaces (no hardcoded UI strings)
```

- Theme: CSS variables + `data-theme="light|dark"`, persisted in localStorage.
- i18n: `react-i18next`, `dir = rtl` for `fa`, lazy namespaces; architecture allows
  adding languages by dropping in a folder.
- Admin app surface (`/admin/*`) is a separate layout + route guard, no admin links
  in public nav (footer `Admin` link only).

## 6. What we deliberately do NOT build in Stage 0

Microservices, Redis, Elasticsearch, Kafka/RabbitMQ, CDN, K8s, distributed tracing.
Each has a defined trigger in `SCALE_PLAN.md`.

## 7. Cross-cutting concerns

- **Config:** `backend/src/config/*` from env + Zod validation at boot; fail fast.
- **Logging:** structured JSON logs (pino), request IDs; audit log in DB for
  sensitive admin actions (separate from app logs).
- **Errors:** domain errors → HTTP mapping in one place (`httpErrors.ts`).
- **Validation:** Zod schemas at API boundary; domain invariants re-checked in domain layer.
- **AuthN/Z:** JWT access tokens (short) — refresh rotation later; RBAC enforced in
  backend guards, never only in the UI.
