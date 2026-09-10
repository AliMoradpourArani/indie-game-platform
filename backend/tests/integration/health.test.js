import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
// Boot the real Express app (no DB needed for health).
process.env.DATABASE_URL ??= 'postgresql://localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-1234';
let app;
beforeAll(async () => {
    const mod = await import('../../src/app.js');
    app = mod.createApp();
});
describe('health', () => {
    it('GET /api/v1/health returns ok', async () => {
        const res = await request(app).get('/api/v1/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
    it('unknown routes return JSON 404', async () => {
        const res = await request(app).get('/api/v1/nope');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
    });
});
//# sourceMappingURL=health.test.js.map