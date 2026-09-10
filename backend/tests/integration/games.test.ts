// Game domain journey against a real PostgreSQL. Needs TEST_DATABASE_URL (see auth.test.ts).
import { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.TEST_DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

describeDb('game domain journey (needs TEST_DATABASE_URL)', () => {
  let app!: Express;
  let token = '';
  const db = new PrismaClient({ datasourceUrl: DB_URL });

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-1234';
    const mod = await import('../../src/app.js');
    app = mod.createApp();

    const email = `gamedev-${Date.now()}@auth.test`;
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', role: 'DEVELOPER', displayName: 'Game Dev' });
    token = reg.body.token as string;

    const other = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `other-${Date.now()}@auth.test`, password: 'password123', role: 'DEVELOPER', displayName: 'Other' });
    (globalThis as { otherToken?: string }).otherToken = other.body.token as string;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('creates a draft, versions it, and hides it from the public until published', async () => {
    const created = await request(app).post('/api/v1/developer/games').set(auth()).send({
      title: 'Test Drift',
      description: 'A test game with enough description.',
      genre: 'Adventure',
      tags: ['test'],
      priceCents: 499,
    });
    expect(created.status).toBe(201);
    expect(created.body.slug).toMatch(/^test-drift-/);

    const version = await request(app)
      .post(`/api/v1/developer/games/${created.body.id}/versions`)
      .set(auth())
      .send({ version: '0.1.0', changelog: 'First.' });
    expect(version.status).toBe(201);

    const dup = await request(app)
      .post(`/api/v1/developer/games/${created.body.id}/versions`)
      .set(auth())
      .send({ version: '0.1.0', changelog: 'Dup.' });
    expect(dup.status).toBe(409);

    // Draft → invisible to the public.
    const pub = await request(app).get(`/api/v1/games/${created.body.slug}`);
    expect(pub.status).toBe(404);

    const mine = await request(app).get('/api/v1/developer/games').set(auth());
    expect(mine.status).toBe(200);
    expect(mine.body.length).toBeGreaterThanOrEqual(1);
  });

  it('forbids editing another developer’s game; players cannot create games', async () => {
    const otherToken = (globalThis as { otherToken?: string }).otherToken!;
    const created = await request(app)
      .post('/api/v1/developer/games')
      .set({ Authorization: `Bearer ${otherToken}` })
      .send({ title: 'Other Game', description: 'Long enough description here.', genre: 'Puzzle' });
    expect(created.status).toBe(201);

    const edit = await request(app)
      .patch(`/api/v1/developer/games/${created.body.id}`)
      .set(auth())
      .send({ title: 'Hijacked' });
    expect(edit.status).toBe(403);

    const playerReg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: `p-${Date.now()}@auth.test`, password: 'password123', role: 'PLAYER', displayName: 'P' });
    const denied = await request(app)
      .post('/api/v1/developer/games')
      .set({ Authorization: `Bearer ${playerReg.body.token}` })
      .send({ title: 'Nope', description: 'Long enough description here.', genre: 'Puzzle' });
    expect(denied.status).toBe(403);
  });
});
