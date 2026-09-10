import { describe, expect, it } from 'vitest';
import { isVersionString, slugify } from '../../src/modules/games/slug.js';
import { assertValidBuild, assertValidImage, isZip, sniffImageKind } from '../../src/modules/games/uploads.js';
import { createGameSchema, createVersionSchema } from '../../src/modules/games/validation.js';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const webp = Buffer.concat([Buffer.from('RIFFxxxxWEBP', 'ascii'), Buffer.from([0x00])]);
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);

describe('slugs and versions', () => {
  it('slugifies titles with a unique suffix', () => {
    const a = slugify('Lantern Drift!');
    const b = slugify('Lantern Drift!');
    expect(a).toMatch(/^lantern-drift-[0-9a-f]{6}$/);
    expect(a).not.toBe(b);
  });

  it('accepts loose semver, rejects garbage', () => {
    for (const v of ['1', '1.0', '1.0.0', '2.3.4-beta.1']) expect(isVersionString(v)).toBe(true);
    for (const v of ['', 'v1', '1.0.0.0', 'latest', '../etc']) expect(isVersionString(v)).toBe(false);
  });
});

describe('upload guards', () => {
  it('sniffs image and zip magic bytes', () => {
    expect(sniffImageKind(png)).toBe('png');
    expect(sniffImageKind(jpeg)).toBe('jpeg');
    expect(sniffImageKind(webp)).toBe('webp');
    expect(sniffImageKind(zip)).toBeNull();
    expect(isZip(zip)).toBe(true);
    expect(isZip(png)).toBe(false);
  });

  it('accepts matching content, rejects mismatches and oversize', () => {
    expect(() => assertValidImage({ mimetype: 'image/png', size: 100, buffer: png })).not.toThrow();
    // Client lies about MIME: content wins.
    expect(() => assertValidImage({ mimetype: 'image/png', size: 100, buffer: zip })).toThrow();
    expect(() => assertValidImage({ mimetype: 'application/zip', size: 100, buffer: zip })).toThrow();
    expect(() => assertValidImage({ mimetype: 'image/png', size: 6 * 1024 * 1024, buffer: png })).toThrow();

    expect(() => assertValidBuild({ mimetype: 'application/zip', size: 100, buffer: zip })).not.toThrow();
    expect(() => assertValidBuild({ mimetype: 'application/zip', size: 100, buffer: png })).toThrow();
  });
});

describe('game validation', () => {
  it('requires meaningful title/description; defaults price to free', () => {
    const parsed = createGameSchema.parse({ title: 'AB', description: '0123456789+', genre: 'Puzzle' });
    expect(parsed.priceCents).toBe(0);
    expect(() => createGameSchema.parse({ title: 'A', description: '0123456789+', genre: 'Puzzle' })).toThrow();
    expect(() => createGameSchema.parse({ title: 'AB', description: 'short', genre: 'Puzzle' })).toThrow();
    expect(() => createVersionSchema.parse({ version: 'latest' })).not.toThrow(); // schema-level; service enforces semver
  });
});
