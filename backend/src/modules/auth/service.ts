import type { PrismaClient, Role } from '@prisma/client';
import { Errors } from '../../common/errors.js';
import { hashPassword, verifyPassword } from './password.js';
import { signToken } from './tokens.js';
import type { LoginInput, RegisterInput } from './validation.js';

export interface AuthResult {
  token: string;
  user: { id: string; email: string; role: Role };
}

interface Deps {
  db: PrismaClient;
  jwtSecret: string;
  jwtExpiresIn: string;
}

export async function registerUser(deps: Deps, input: RegisterInput): Promise<AuthResult> {
  const existing = await deps.db.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw Errors.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await deps.db.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      profile: { create: { displayName: input.displayName } },
      ...(input.role === 'DEVELOPER'
        ? { developerProfile: { create: { studioName: input.studioName ?? input.displayName } } }
        : {}),
    },
  });

  return {
    token: signToken({ sub: user.id, role: user.role }, deps.jwtSecret, deps.jwtExpiresIn),
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function loginUser(deps: Deps, input: LoginInput): Promise<AuthResult> {
  const user = await deps.db.user.findUnique({ where: { email: input.email.toLowerCase() } });
  // Same error for unknown email vs wrong password (no account enumeration).
  if (!user || user.status !== 'ACTIVE') throw Errors.unauthorized('Invalid email or password');
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw Errors.unauthorized('Invalid email or password');

  return {
    token: signToken({ sub: user.id, role: user.role }, deps.jwtSecret, deps.jwtExpiresIn),
    user: { id: user.id, email: user.email, role: user.role },
  };
}

export async function getMe(deps: Pick<Deps, 'db'>, userId: string) {
  const user = await deps.db.user.findUnique({
    where: { id: userId },
    include: { profile: true, developerProfile: true },
  });
  if (!user || user.status !== 'ACTIVE') throw Errors.unauthorized('Account unavailable');
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}
