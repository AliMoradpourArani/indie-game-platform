// Short-lived HMAC download tokens binding (userId, buildId, expiry).
// Stage 0: tokens are redeemed at GET /files/<token>. Future: S3 signed URLs.
import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export interface DownloadClaims {
  userId: string;
  buildId: string;
  exp: number; // unix seconds
}

export function createDownloadToken(
  claims: DownloadClaims,
  secret: string,
): string {
  const payload = b64url(JSON.stringify(claims));
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token: string, secret: string, nowSec = Date.now() / 1000): DownloadClaims {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) throw new Error('Malformed download token');
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Invalid download token signature');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DownloadClaims;
  if (typeof claims.exp !== 'number' || claims.exp <= nowSec) throw new Error('Download token expired');
  if (!claims.userId || !claims.buildId) throw new Error('Malformed download token claims');
  return claims;
}
