import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string; // user id
  role: 'PLAYER' | 'DEVELOPER' | 'ADMIN';
}

export function signToken(payload: TokenPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === 'string' || !decoded.sub || !decoded.role) {
    throw new Error('Invalid token claims');
  }
  return { sub: String(decoded.sub), role: decoded.role as TokenPayload['role'] };
}
