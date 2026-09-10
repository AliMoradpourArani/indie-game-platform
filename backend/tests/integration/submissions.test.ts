// End-to-end review cycle: draft → submit → claim → request changes → withdraw →
// resubmit → approve → publish, with history + audit. Needs TEST_DATABASE_URL.
import { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DB_URL = process.env.TEST_DATABASE_URL;
const describeDb = DB_URL ? describe : describe.skip;

async function register(app: Express, email: string, role: 'DEVELOPER' | 'ADMIN' | 'PLAYER') {
  const res = await request(app).post('/api/v1/auth/register').send({
    email, password: 'password123', role: role === 'ADMIN' ? 'PLAYER' : role, displayName: email,
    ...(role === 'DEVELOPER' ? { studioName: 'S' } : {}),
  });
  return res.body.token as string;
}

describeDb('submission review cycle (needs TEST_DATABASE_URL)', () => {
  let app!: Express;
  const db = new PrismaClient({ datasourceUrl: DB_URL });
  let dev = '';
  let admin = '';
  let gameId = '';

  beforeAll(async () => {
    process.env.DATABASE_URL = DB_URL;
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough-1234';
    const mod = await import('../../src/app.js');
    app = mod.createApp();

    const stamp = Date.now();
    dev = await register(app, `cycle-dev-${stamp}@auth.test`, 'DEVELOPER');
    // Admins are created out-of-band: promote a registered user directly.
    const adminEmail = `cycle-admin-${stamp}@auth.test`;
    admin = await register(app, adminEmail, 'PLAYER');
    await db.user.update({ where: { email: adminEmail }, data: { role: 'ADMIN' } });
    const relogin = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password: 'password123' });
    admin = relogin.body.token as string;

    const game = await request(app)
      .post('/api/v1/developer/games')
      .set({ Authorization: `Bearer ${dev}` })
      .send({ title: 'Cycle Game', description: 'Long enough description here.', genre: 'Puzzle' });
    gameId = game.body.id as string;
    await request(app)
      .post(`/api/v1/developer/games/${gameId}/versions`)
      .set({ Authorization: `Bearer ${dev}` })
      .send({ version: '1.0.0', changelog: 'First.' });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  const asDev = () => ({ Authorization: `Bearer ${dev}` });
  const asAdmin = () => ({ Authorization: `Bearer ${admin}` });

  it('runs the full cycle with feedback and history', async () => {
    // Submit → pending.
    const sub1 = await request(app).post(`/api/v1/developer/games/${gameId}/submit`).set(asDev());
    expect(sub1.status).toBe(201);
    expect(sub1.body.state).toBe('PENDING_REVIEW');
    const subId = sub1.body.id as string;

    // Player cannot touch admin review endpoints.
    const player = await register(app, `cycle-player-${Date.now()}@auth.test`, 'PLAYER');
    const denied = await request(app).post(`/api/v1/admin/submissions/${subId}/claim`).set({ Authorization: `Bearer ${player}` });
    expect(denied.status).toBe(403);

    // Admin claims → under review → requests changes with feedback.
    expect((await request(app).post(`/api/v1/admin/submissions/${subId}/claim`).set(asAdmin())).status).toBe(200);
    const review1 = await request(app).post(`/api/v1/admin/submissions/${subId}/review`).set(asAdmin()).send({
      decision: 'CHANGES_REQUIRED', comment: 'Please add a longer description.',
    });
    expect(review1.status).toBe(201);

    // Developer edits (allowed in CHANGES_REQUIRED), withdraws to draft, resubmits.
    const edit = await request(app).patch(`/api/v1/developer/games/${gameId}`).set(asDev()).send({
      description: 'A much longer, improved description for the game.',
    });
    expect(edit.status).toBe(200);
    expect((await request(app).post(`/api/v1/developer/submissions/${subId}/withdraw`).set(asDev())).status).toBe(200);
    const sub2 = await request(app).post(`/api/v1/developer/games/${gameId}/submit`).set(asDev());
    expect(sub2.status).toBe(201);
    expect(sub2.body.state).toBe('PENDING_REVIEW');

    // Approve → publish.
    expect((await request(app).post(`/api/v1/admin/submissions/${subId}/claim`).set(asAdmin())).status).toBe(200);
    const review2 = await request(app).post(`/api/v1/admin/submissions/${subId}/review`).set(asAdmin()).send({
      decision: 'APPROVED', comment: 'Looks great. Ship it!',
    });
    expect(review2.status).toBe(201);
    const pub = await request(app).post(`/api/v1/developer/games/${gameId}/publish`).set(asDev());
    expect(pub.status).toBe(200);
    expect(pub.body.state).toBe('PUBLISHED');

    // Public page now visible; history shows both reviews + audit trail.
    const game = await db.game.findUniqueOrThrow({ where: { id: gameId } });
    const pubPage = await request(app).get(`/api/v1/games/${game.slug}`);
    expect(pubPage.status).toBe(200);

    const history = await request(app).get(`/api/v1/admin/submissions/${subId}/history`).set(asAdmin());
    expect(history.status).toBe(200);
    expect(history.body.submission.reviews).toHaveLength(2);
    expect(history.body.trail.length).toBeGreaterThanOrEqual(6);

    // Overview prioritizes moderation work.
    const overview = await request(app).get('/api/v1/admin/overview').set(asAdmin());
    expect(overview.status).toBe(200);
    expect(overview.body.published).toBeGreaterThanOrEqual(1);
  });
});
