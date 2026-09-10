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
