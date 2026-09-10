# Production Readiness (Phase 9 — plan only, no deploy)

> No cloud deployment happens unless explicitly requested. This file makes the
> first deployment boring when that day comes. Triggers for each step live in
> `SCALE_PLAN.md` — do not implement Stage 2/3 items here.

## 1. Target (Stage 1 — single host)

```text
Users → Caddy (TLS, reverse proxy) → Backend (systemd/Docker, :4000) → PostgreSQL → Object storage
```

## 2. Production config checklist

- [ ] `DATABASE_URL` → managed Postgres (or dedicated host, not the app disk)
- [ ] `JWT_SECRET`, `DOWNLOAD_TOKEN_SECRET` → 64-char random, from secret manager/env, rotated
- [ ] `NODE_ENV=production`, structured JSON logs shipped to a file collector
- [ ] CORS origin → production domain only (no localhost)
- [ ] Rate limits tightened behind proxy (`trust proxy` + real-IP keying)
- [ ] Seed/dev credentials never created; admin provisioned via console + 2FA (when added)
- [ ] `storage/` replaced by `S3StorageService` (same interface) + CDN signed URLs

## 3. Backups (must be drilled before launch)

- PostgreSQL: daily `pg_dump` + WAL archiving (managed PITR preferred); **test restore monthly**.
- Object storage: versioning + cross-region replication (when multi-region matters).
- Secrets: backed up offline in two places; rotation runbook below.

## 4. Runbooks (minimum)

- **Deploy:** pull tag → `npm ci` → `prisma migrate deploy` → health check → switch traffic.
- **Rollback:** previous tag + `prisma migrate resolve` (down migrations avoided; prefer forward fixes).
- **Secret rotation:** issue new JWT secret as secondary → promote → revoke after max token TTL.
- **Incident:** freeze deploys → snapshot DB → read audit logs (`/admin/audit` + app logs) → postmortem in `DECISIONS.md`.

## 5. Monitoring (Stage 1 minimum)

Uptime check on `/api/v1/health`, error-rate alert (>1% 5xx / 5 min), disk/DB-space
alerts, daily backup-success check. Metrics/tracing land in Stage 2 with cause.

## 6. Launch gate

Local system stable → all Phase 8 checks green on prod-like data → backup restore
drilled → secrets rotated → deploy. In that order. No exceptions.
