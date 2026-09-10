// Full auth journey against a real PostgreSQL.
// Runs only when TEST_DATABASE_URL is set (e.g. CI / Docker machine):
//   TEST_DATABASE_URL="postgresql://..." npm test
// Otherwise skipped — unit tests + contract checks still run in `npm test`.
import { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.TEST_DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

describeDb('auth journey (needs TEST_DATABASE_URL)', () => {
  let app!: Express;
  const db = new PrismaClient({ datasourceUrl: DB_URL });

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-1234';
    const mod = await import('../../src/app.js');
    app = mod.createApp();
    await db.$queryRaw`SELECT 1`;
    // Isolate: remove fixtures from previous runs.
    await db.user.deleteMany({ where: { email: { endsWith: '@auth.test' } } });
  });

  afterAll(async () => {
    await db.user.deleteMany({ where: { email: { endsWith: '@auth.test' } } });
    await db.$disconnect();
  });

  it('register → login → me → logout; duplicate register → 409', async () => {
    const email = `player-${Date.now()}@auth.test`;

    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', role: 'PLAYER', displayName: 'Tester' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.email).toBe(email);
    expect(reg.body.token).toBeTypeOf('string');

    const dup = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', role: 'PLAYER', displayName: 'Tester' });
    expect(dup.status).toBe(409);

    const bad = await request(app).post('/api/v1/auth/login').send({ email, password: 'nope-nope-nope' });
    expect(bad.status).toBe(401);

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'password123' });
    expect(login.status).toBe(200);
    const token = login.body.token as string;

    const me = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
    expect(me.body.passwordHash).toBeUndefined();

    const anon = await request(app).get('/api/v1/users/me');
    expect(anon.status).toBe(401);

    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${token}`);
    expect(logout.status).toBe(200);
  });

  it('developer registration creates a developer profile', async () => {
    const email = `dev-${Date.now()}@auth.test`;
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', role: 'DEVELOPER', displayName: 'Studio One', studioName: 'Studio One' });
    expect(reg.status).toBe(201);
    expect(reg.body.user.role).toBe('DEVELOPER');
    const row = await db.user.findUnique({ where: { email }, include: { developerProfile: true } });
    expect(row?.developerProfile?.studioName).toBe('Studio One');
  });
});
