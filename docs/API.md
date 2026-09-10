# API — REST `/api/v1`

Base URL (local): `http://localhost:4000/api/v1`.
Frontend never touches the DB. Auth: `Authorization: Bearer <jwt>` (admin uses the
same scheme with `role=ADMIN` + `/admin/*` guards). Full OpenAPI to be added in
Phase 2; this file is the contract until then.

## Conventions

- JSON everywhere; errors: `{ "error": { "code": "STRING_CODE", "message": "…" } }`.
- Pagination: `?page=1&pageSize=20` → `{ data, page, pageSize, total }`.
- Idempotency for money: `Idempotency-Key: <uuid>` header on checkout/confirm.
- Versioning: breaking changes → `/api/v2`; additive changes stay on v1.

## Endpoints (Stage 0 → Phase 6 rollout)

```text
GET  /health                       # liveness (no auth)        [Phase 1]
GET  /ready                        # db+storage checks         [Phase 1]

# Auth & users (Phase 2)
POST /auth/register {email,password,role:PLAYER|DEVELOPER,displayName}
POST /auth/login {email,password} → {token,user}
POST /auth/logout
GET  /users/me                     # Bearer required

# Games & versions (Phase 3)
GET  /games?search&genre&tag&sort&…
GET  /games/:slug
POST /developer/games              # DEVELOPER, creates DRAFT
PATCH /developer/games/:id
POST /developer/games/:id/versions
POST /developer/games/:id/media    # multipart via StorageService

# Submissions & admin review (Phase 4) ✅
POST /developer/games/:id/submit            # DRAFT→PENDING_REVIEW
POST /developer/submissions/:id/withdraw    # →DRAFT
GET  /developer/games/:id/submission        # latest submission + admin feedback
GET  /admin/submissions?state=PENDING_REVIEW # ADMIN
POST /admin/submissions/:id/review {decision,comment}  # UNDER_REVIEW→…
GET  /admin/submissions/:id/history
GET  /admin/overview                        # moderation-first counts
GET  /admin/audit?take=50                   # audit trail viewer
POST /developer/games/:id/publish           # APPROVED→PUBLISHED

# Purchases, library, downloads (Phase 6)
POST /purchases/checkout {gameId} + Idempotency-Key → {checkoutId}
POST /purchases/confirm {checkoutId}        # backend verifies with provider
GET  /library                               # entitlements
GET  /library/:gameId/download/:buildId → {url}  # short-lived signed token
```

##paid-game file protection

Build bytes are **never** under a public static dir. Downloads resolve via
`GET /files/<token>` where `token` is a short-lived HMAC token binding
(userId, buildId, expiry) after an entitlement check.
