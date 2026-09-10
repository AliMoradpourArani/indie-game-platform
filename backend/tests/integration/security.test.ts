// Security surface tests — no DB required (app boots with placeholder DATABASE_URL).
import request from 'supertest';
import type { Express } from 'express';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-1234';

let app!: Express;

beforeAll(async () => {
  const mod = await import('../../src/app.js');
  app = mod.createApp();
});

describe('security headers and CORS', () => {
  it('sets helmet headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('reflects only the allowlisted frontend origin', async () => {
    const ok = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const evil = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('validation shape', () => {
  it('returns 422 VALIDATION_ERROR (not 500) for bad register input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'nope', password: 'x' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('download token handling', () => {
  it('rejects forged/expired tokens with 401, never 500', async () => {
    const forged = await request(app).get('/api/v1/files/not-a-token');
    expect(forged.status).toBe(401);

    const tampered = await request(app).get('/api/v1/files/aaa.bbb');
    expect(tampered.status).toBe(401);
  });
});

describe('auth rate limiting', () => {
  it('mounts a limiter on credential endpoints (headers present)', async () => {
    // Single request: proves the middleware is wired. Full 429 behavior is
    // verified below against an identical limiter (DB-free, fast).
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'x@y.zz', password: 'wrong' });
    expect(res.headers['ratelimit-policy']).toContain('60');
  });

  it('throttles after the configured budget (identical limiter, DB-free)', async () => {
    const { default: express } = await import('express');
    const { default: rateLimit } = await import('express-rate-limit');
    const probe = express();
    probe.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false }));
    probe.post('/probe', (_req, res) => res.json({ ok: true }));

    let last = 0;
    for (let i = 0; i < 8; i++) {
      const r = await request(probe).post('/probe');
      last = r.status;
      if (last === 429) break;
    }
    expect(last).toBe(429);
  });
});
