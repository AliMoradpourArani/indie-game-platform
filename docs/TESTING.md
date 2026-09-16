# Testing

Mandatory. No phase is "done" without its tests green.

## 1. Pyramid (Stage 0)

```text
E2E (Playwright, critical journeys only — from Phase 4/6)
Integration (Supertest + real Postgres via Compose — auth, submissions, purchases)
Unit (Vitest — pure domain: state machines, permissions, entitlements, validation)
```

## 2. What must be covered (minimum)

- **Unit:** submission transitions (all legal/illegal), entitlement derivation
  (COMPLETED→grant, PENDING/FAILED→deny), download-token expiry, storage-key safety.
- **Integration:** register→login→me→logout; RBAC denials; game draft→submit→review→
  resubmit→approve→publish; purchase→entitlement→download allow/deny.
- **E2E (later):** the two journeys in the brief (developer submission cycle;
  player purchase→library→download) on Chromium + mobile viewport.

## 3. Commands

```bash
cd backend
npm test              # vitest run (unit + integration)
npm run test:watch
npm run test:coverage # branches/functions/lines; domain files target ≥90%
```

- Integration tests boot the Express app with a dedicated test DB
  (`DATABASE_URL` override) and truncate between suites. Never run against dev DB.
- Seed data is for humans; tests create their own fixtures.

## 4. Discipline

New domain rule → new unit test first (or with the code). Bug fix → regression test.
Flaky test = bug: quarantine, fix, or delete — never ignore.

## 5. E2E plan (Playwright — pending live DB, Phase 8 status)

Critical journeys are fully specified as DB-gated integration tests today
(`submissions.test.ts`, `purchases.test.ts` cover both brief journeys API-level).
Browser E2E (Chromium + mobile viewport, RTL spot-check) will be added once a live
PostgreSQL is available (`docker compose up -d db`): register→browse→purchase→
library→download and the full submission cycle. No E2E harness is committed until
it can run green — un-runnable tests are not committed.

Recommendation E2E (also pending live DB + browser harness): register → choose
role → onboarding (select 5, sixth stays disabled, deselect re-enables, continue)
→ homepage shows personalized feed → open reco game (`?src=reco`) → similar-games
rail scrolls → event rows recorded; plus the skip path (generic feed, behavior
gradually personalizes). Unit tests already pin the engine rules behind it.

## 6. Current scoreboard (Phase 8 + recommendations)

- Backend: **48 passed / 7 skipped** (skips require `TEST_DATABASE_URL`).
  New `tests/unit/recommendations.test.ts` (15 tests): catalog integrity,
  5-cap validation, supported event types, client purchase-claim rejection, repeat-view upgrade, decay
  monotonicity, profile derivation, same-genre similarity priority, ranking
  over popularity, truthful explanations, genre cap + backfill, cold-start
  ordering.
- `tsc` clean on both apps; `vite build` clean; `prisma validate` + `migrate diff` clean.
- Security suite: headers, CORS, 422 shape, token 401s, rate limiting — green.
