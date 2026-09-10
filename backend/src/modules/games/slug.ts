import { randomBytes } from 'node:crypto';

/** URL-safe slug from title + random suffix (avoids enumeration, handles dup titles). */
export function slugify(title: string): string {
  const base =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'game';
  return `${base}-${randomBytes(3).toString('hex')}`;
}

/** Loose semver: 1, 1.0, 1.0.0 with optional -prerelease. Strict semver lands with release tooling. */
export function isVersionString(v: string): boolean {
  return /^\d+(\.\d+){0,2}(-[a-zA-Z0-9.]+)?$/.test(v);
}
