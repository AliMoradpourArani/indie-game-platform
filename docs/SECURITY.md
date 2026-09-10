# Security

Security is architectural, not a final pass. Backend enforces everything; the UI
is convenience only.

## 1. Authentication & sessions

- Passwords: argon2id (preferred) or bcrypt cost ≥ 12; never log or return hashes.
- JWT access tokens, short TTL; secret ≥ 32 bytes from env; rotate via versioned keys later.
- Admin uses a separate login surface (`/admin/login`) + `requireAdmin` guard;
  no admin affordances in public nav (footer link only).
- Future: refresh-token rotation + reuse detection; account lockout + 2FA for admins.

## 2. Authorization (RBAC, backend-enforced)

| Capability | PLAYER | DEVELOPER | ADMIN |
|---|---|---|---|
| Browse/purchase/download owned | ✅ | ✅ | — |
| Create/edit own games | — | ✅ (own only) | — |
| Submit/withdraw/publish own | — | ✅ (own only) | — |
| Review any submission | — | — | ✅ |
| Manage users/games/reports | — | — | ✅ |

Ownership checks compare `game.developerId === req.user.id` on **every** write.
List endpoints scope by role. Tests must cover cross-user access denial.

## 3. Input & injection

- Zod validation at the API boundary; domain re-checks invariants.
- Prisma parameterized queries only — no raw SQL string interpolation.
- File uploads: allowlist MIME + extension + magic-byte sniff, size caps,
  server-generated `storageKey`s, no executable serving inline (`Content-Disposition:
  attachment` for builds), virus/scan hook point before publish (Stage 1+).

## 4. Web & platform

- Helmet security headers, CORS allowlist (local: Vite origin only), rate limits
  (auth stricter), CSRF: JWT-in-header pattern (no cookies in Stage 0 → no CSRF;
  revisit if cookie sessions are introduced).
- XSS: React escaping + no `dangerouslySetInnerHTML` for user content (sanitize
  markdown if introduced). Path traversal: `path.basename` + key prefix checks.
- Payments: **never trust frontend `payment successful`** — confirm via provider
  verification/webhook signature; idempotency keys; entitlement granted only after
  `COMPLETED`. Audit-log every admin decision and every entitlement grant.
- Secrets: env only, `.env` git-ignored, `.env.example` has placeholders.

## 5. Review checklist (Phase 8)

AuthN/Z matrix test, upload fuzz (oversize/wrong-type/traversal), rate-limit test,
header test, dependency audit (`npm audit`), seed-credential rotation check, backup
restore drill (Phase 9).

## 6. Authorization matrix (audited Phase 8 — all enforced server-side)

| Endpoint | PLAYER | DEVELOPER | ADMIN | Unauth |
|---|---|---|---|---|
| `GET /games`, `/games/:slug`, `/genres`, `/developers/:id` | ✅ | ✅ | ✅ | ✅ (published only) |
| `POST /auth/register` (PLAYER/DEVELOPER only) | ✅ | ✅ | ✅ | ✅ |
| `GET /auth/me`, `/users/me`, `/library`, downloads | ✅ | ✅ | ✅ | ❌ 401 |
| `POST /developer/*` (own games only) | ❌ 403 | ✅ own | ✅ | ❌ 401 |
| `POST /admin/*`, `GET /admin/*` | ❌ 403 | ❌ 403 | ✅ | ❌ 401 |

Cross-user writes tested (`games.test.ts`: 403 on foreign game; `submissions.test.ts`:
player denied admin claim). Middleware unit-tested (`rbac.test.ts`).

## 7. Dependency audit (2026-09-10)

- `qs` GHSA (via Express 4): **fixed** — forced to 6.16.0 via root `overrides`,
  full suite re-run green (32 passed).
- `react-router` 2× moderate (≤7.17.0): **accepted risk** — SSR hydration issue
  N/A (no SSR); backslash open-redirect N/A (no user-controlled `to` targets).
  Revisit: upgrade to React Router v7 when convenient.
- `vite`/`vitest` high/critical: **dev-only** (localhost dev servers, never shipped
  or exposed); no action beyond keeping them loopback-bound.
- Auth rate limit (60/15min credential endpoints) + helmet + CORS allowlist +
  Zod-422 mapping covered by `tests/integration/security.test.ts` (6 tests).
