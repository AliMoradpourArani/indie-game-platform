import bcrypt from 'bcryptjs';

// Cost 12 per SECURITY.md. Pure-JS bcryptjs in Stage 0 (no native toolchain needed);
// upgrade path to argon2id is a drop-in behind these two functions (see DECISIONS).
const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}
