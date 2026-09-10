// Player journey: purchase → library → download allow/deny. Needs TEST_DATABASE_URL.
import { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.TEST_DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

describeDb('purchase → library → download (needs TEST_DATABASE_URL)', () => {
  let app!: Express;
  const db = new PrismaClient({ datasourceUrl: DB_URL });
  let dev = '';
  let gameId = '';
  let paidBuildId = '';
  let demoBuildId = '';

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-1234';
    const mod = await import('../../src/app.js');
    app = mod.createApp();
    const stamp = Date.now();

    const devReg = await request(app).post('/api/v1/auth/register').send({
      email: `shop-dev-${stamp}@auth.test`, password: 'password123', role: 'DEVELOPER',
      displayName: 'Shop Dev', studioName: 'Shop',
    });
    dev = devReg.body.token as string;
    const asDev = { Authorization: `Bearer ${dev}` };

    // Paid game, published end-to-end (dev submits, promoted admin approves).
    const game = await request(app).post('/api/v1/developer/games').set(asDev).send({
      title: 'Shop Game', description: 'Long enough description here.', genre: 'Action', priceCents: 999,
    });
    gameId = game.body.id as string;
    const version = await request(app).post(`/api/v1/developer/games/${gameId}/versions`).set(asDev).send({ version: '1.0.0', changelog: 'v1' });
    const versionId = version.body.id as string;
    await db.gameBuild.createMany({
      data: [
        { versionId, platform: 'WINDOWS', storageKey: `test/${stamp}/full.zip`, sizeBytes: 10, sha256: 'a'.repeat(64), demo: false },
        { versionId, platform: 'WINDOWS', storageKey: `test/${stamp}/demo.zip`, sizeBytes: 10, sha256: 'b'.repeat(64), demo: true },
      ],
    });
    const builds = await db.gameBuild.findMany({ where: { versionId } });
    paidBuildId = builds.find((b) => !b.demo)!.id;
    demoBuildId = builds.find((b) => b.demo)!.id;

    const sub = await request(app).post(`/api/v1/developer/games/${gameId}/submit`).set(asDev);
    await db.submission.update({ where: { id: sub.body.id }, data: { state: 'APPROVED' } });
    await request(app).post(`/api/v1/developer/games/${gameId}/publish`).set(asDev);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('denies full download before purchase; allows demo; grants on confirm; idempotent retry', async () => {
    const playerReg = await request(app).post('/api/v1/auth/register').send({
      email: `shopper-${Date.now()}@auth.test`, password: 'password123', role: 'PLAYER', displayName: 'Shopper',
    });
    const asPlayer = { Authorization: `Bearer ${playerReg.body.token}` };

    // Full build denied pre-purchase; demo allowed.
    expect((await request(app).get(`/api/v1/library/${gameId}/download/${paidBuildId}`).set(asPlayer)).status).toBe(402);
    const demo = await request(app).get(`/api/v1/library/${gameId}/download/${demoBuildId}`).set(asPlayer);
    expect(demo.status).toBe(200);
    expect(demo.body.url).toMatch(/^\/api\/v1\/files\//);

    // Checkout requires idempotency key; confirm grants entitlement.
    const noKey = await request(app).post('/api/v1/purchases/checkout').set(asPlayer).send({ gameId });
    expect(noKey.status).toBe(422);

    const key = randomUUID();
    const co = await request(app).post('/api/v1/purchases/checkout').set({ ...asPlayer, 'Idempotency-Key': key }).send({ gameId });
    expect(co.status).toBe(201);
    expect(co.body.checkoutId).toBeTypeOf('string');

    // Retry with same key returns the original purchase (no double charge).
    const retry = await request(app).post('/api/v1/purchases/checkout').set({ ...asPlayer, 'Idempotency-Key': key }).send({ gameId });
    expect(retry.status).toBe(201);
    expect(retry.body.purchase.id).toBe(co.body.purchase.id);

    const confirm = await request(app).post('/api/v1/purchases/confirm').set(asPlayer).send({ checkoutId: co.body.checkoutId });
    expect(confirm.status).toBe(200);
    expect(confirm.body.status).toBe('COMPLETED');

    const lib = await request(app).get('/api/v1/library').set(asPlayer);
    expect(lib.status).toBe(200);
    expect(lib.body.map((e: { game: { id: string } }) => e.game.id)).toContain(gameId);

    const allowed = await request(app).get(`/api/v1/library/${gameId}/download/${paidBuildId}`).set(asPlayer);
    expect(allowed.status).toBe(200);
  });

  it('free games grant instantly without a provider round-trip', async () => {
    const asDev = { Authorization: `Bearer ${dev}` };
    const free = await request(app).post('/api/v1/developer/games').set(asDev).send({
      title: 'Free Game', description: 'Long enough description here.', genre: 'Puzzle', priceCents: 0,
    });
    await request(app).post(`/api/v1/developer/games/${free.body.id}/versions`).set(asDev).send({ version: '1.0.0', changelog: 'v1' });
    const sub = await request(app).post(`/api/v1/developer/games/${free.body.id}/submit`).set(asDev);
    await db.submission.update({ where: { id: sub.body.id }, data: { state: 'APPROVED' } });
    await request(app).post(`/api/v1/developer/games/${free.body.id}/publish`).set(asDev);

    const playerReg = await request(app).post('/api/v1/auth/register').send({
      email: `freebie-${Date.now()}@auth.test`, password: 'password123', role: 'PLAYER', displayName: 'Freebie',
    });
    const asPlayer = { Authorization: `Bearer ${playerReg.body.token}` };
    const co = await request(app).post('/api/v1/purchases/checkout').set({ ...asPlayer, 'Idempotency-Key': randomUUID() }).send({ gameId: free.body.id });
    expect(co.status).toBe(201);
    expect(co.body.purchase.status).toBe('COMPLETED');

    const lib = await request(app).get('/api/v1/library').set(asPlayer);
    expect(lib.body.map((e: { game: { id: string } }) => e.game.id)).toContain(free.body.id);
  });
});
