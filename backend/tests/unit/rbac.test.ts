import { describe, expect, it, vi } from 'vitest';
import type { AuthRequest } from '../../src/modules/auth/middleware.js';
import { requireAdmin, requireAuth, requireRole } from '../../src/modules/auth/middleware.js';
import { signToken } from '../../src/modules/auth/tokens.js';

const SECRET = 'test-secret-that-is-long-enough-1234';
process.env.JWT_SECRET = SECRET;
process.env.DATABASE_URL ??= 'postgresql://localhost:5432/test';

function reqWith(authHeader?: string): AuthRequest {
  return { headers: { authorization: authHeader ?? '' } } as unknown as AuthRequest;
}

describe('RBAC guards', () => {
  it('requireAuth rejects missing/invalid tokens, accepts valid ones', () => {
    const next = vi.fn();
    requireAuth(reqWith(), {} as never, next);
    expect(next.mock.calls[0][0]?.status).toBe(401);

    const good = signToken({ sub: 'u1', role: 'PLAYER' }, SECRET, '1h');
    const next2 = vi.fn();
    requireAuth(reqWith(`Bearer ${good}`), {} as never, next2);
    expect(next2).toHaveBeenCalledWith();
  });

  it('requireRole enforces backend-side; frontend checks are not trusted', () => {
    const player = signToken({ sub: 'u1', role: 'PLAYER' }, SECRET, '1h');
    const req = reqWith(`Bearer ${player}`);
    requireAuth(req, {} as never, vi.fn());
    const next = vi.fn();
    requireAdmin(req, {} as never, next);
    expect(next.mock.calls[0][0]?.status).toBe(403);

    const admin = signToken({ sub: 'a1', role: 'ADMIN' }, SECRET, '1h');
    const reqAdmin = reqWith(`Bearer ${admin}`);
    requireAuth(reqAdmin, {} as never, vi.fn());
    const nextAdmin = vi.fn();
    requireRole('ADMIN', 'DEVELOPER')(reqAdmin, {} as never, nextAdmin);
    expect(nextAdmin).toHaveBeenCalledWith();
  });
});
