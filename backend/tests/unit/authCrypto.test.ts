import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js';
import { signToken, verifyToken } from '../../src/modules/auth/tokens.js';
import { loginSchema, registerSchema } from '../../src/modules/auth/validation.js';

const SECRET = 'test-secret-that-is-long-enough-1234';

describe('passwords', () => {
  it('hashes and verifies; wrong password fails', async () => {
    const hash = await hashPassword('CorrectHorse123!');
    expect(hash).not.toContain('CorrectHorse123!');
    expect(await verifyPassword('CorrectHorse123!', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });
});

describe('tokens', () => {
  it('round-trips role claims; rejects tampered tokens', () => {
    const token = signToken({ sub: 'user-1', role: 'DEVELOPER' }, SECRET, '1h');
    expect(verifyToken(token, SECRET)).toEqual({ sub: 'user-1', role: 'DEVELOPER' });

    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifyToken(tampered, SECRET)).toThrow();
    expect(() => verifyToken(token, 'different-secret-that-is-long-enough')).toThrow();
  });
});

describe('auth validation', () => {
  it('accepts valid register/login input', () => {
    expect(() =>
      registerSchema.parse({
        email: 'dev@example.com',
        password: 'password123',
        role: 'PLAYER',
        displayName: 'Dev',
      }),
    ).not.toThrow();
    expect(() => loginSchema.parse({ email: 'a@b.co', password: 'x' })).not.toThrow();
  });

  it('rejects bad email, short password, and ADMIN self-registration', () => {
    expect(() =>
      registerSchema.parse({ email: 'not-an-email', password: 'password123', role: 'PLAYER', displayName: 'D' }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({ email: 'a@b.co', password: 'short', role: 'PLAYER', displayName: 'Dev' }),
    ).toThrow();
    // ADMIN accounts are created out-of-band (seed/console), never via public register.
    expect(() =>
      registerSchema.parse({ email: 'a@b.co', password: 'password123', role: 'ADMIN', displayName: 'Root' }),
    ).toThrow();
  });
});
