# Scale Plan — read BEFORE every major phase

This file defines how the platform evolves with traffic, data, and operational
complexity. **Do not implement a later stage before its trigger is met.**
Default posture: simplest architecture that can evolve.

## Stage 0 — Local Development (NOW)

```text
Frontend (Vite :5173)
    ↓ REST /api/v1
Backend (Express :4000, modular monolith)
    ↓ Prisma
PostgreSQL 16 (docker-compose)
    ↓
Local File Storage (./storage, served via controlled /files with signed tokens)
```

**Focus:** simplicity, clean module boundaries, maintainability, fast iteration.

| Concern       | Stage 0 choice                          | Explicitly deferred            |
|---------------|-----------------------------------------|--------------------------------|
| DB            | Single Postgres (Compose)               | Replicas, pooling (PgBouncer)  |
| Storage       | Local FS behind `StorageService`        | S3 + CDN signed URLs           |
| Payments      | `LocalTestPaymentProvider` (simulated)  | Real PSP + webhooks            |
| Email         | `LogMailer`                             | SMTP / transactional ESP       |
| Search        | Postgres `ILIKE` (+ `pg_trgm` if needed)| Dedicated search engine        |
| Cache         | None (in-process memo only if measured) | Redis                          |
| Jobs          | Inline/synchronous                      | Queue + workers                |
| Observability | Structured logs + DB audit log          | Metrics, tracing, centralized logs |
| Deploy        | `docker compose` on one host            | LB, multi-instance, K8s        |

**Exit trigger → Stage 1:** the team decides to serve real users publicly
(requires HTTPS, backups, real storage, basic monitoring).

## Stage 1 — Small Production (single host / simple VPS)

```text
Users → Reverse Proxy (Caddy/Nginx, TLS) → Backend → PostgreSQL → Object Storage
```

Introduce **only**: managed Postgres (or hardened Compose + backups), S3-compatible
object storage behind the existing `StorageService`, TLS, log aggregation file,
uptime + error monitoring, daily DB + storage backups (tested restores), basic
rate limiting, security headers, dependency scanning.

**Exit trigger → Stage 2:** sustained load (e.g. p95 latency breaches SLO, or
background work blocks requests) **or** team/throughput needs it. Evidence required.

## Stage 2 — Growing Platform (as justified, incrementally)

```text
CDN → Load Balancer → N×Backend → PostgreSQL (+pool) → Object Storage
                        ├→ Redis (sessions/rate-limit/cache/queue)
                        └→ Background Workers → (thumbnails, scans, emails, indexing)
```

Each addition needs a written trigger: Redis (measured hot paths / rate-limit
abuse), workers (uploads/media exceed request budgets), search engine (DB search
insufficient for relevance/scale). No speculative adoption.

## Stage 3 — Large Platform (only when system requirements justify it)

Horizontal scaling, read replicas, dedicated search, distributed workers,
CDN optimization, advanced observability (metrics/tracing/SLOs), and **selective**
service decomposition — only modules with independent scaling/ownership needs
(e.g. search, notifications, payments webhooks). Never a wholesale rewrite.

## Anti-premature-scale checklist (run before adding any infra)

1. What measured problem does this solve (numbers, not adjectives)?
2. Can a simpler change (index, query fix, pagination, inline job limit) solve it?
3. Does the change respect existing abstractions (no business-logic rewrite)?
4. Is there a rollback plan?
5. Is it documented in `DECISIONS.md` with trigger + trade-offs?
