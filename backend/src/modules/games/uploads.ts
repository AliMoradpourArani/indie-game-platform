// Upload guards: allowlist + magic-byte sniffing (never trust client MIME).
// Pure functions — unit-tested without touching disk.

export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const BUILD_MIMES = ['application/zip'] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_BUILD_BYTES = 500 * 1024 * 1024; // 500 MB local cap

export function sniffImageKind(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString() === 'RIFF' &&
    buf.subarray(8, 12).toString() === 'WEBP'
  ) return 'webp';
  return null;
}

export function isZip(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}

/** Throws on violation; returns nothing on success. */
export function assertValidImage(file: { mimetype: string; size: number; buffer: Buffer }): void {
  if (!IMAGE_MIMES.includes(file.mimetype as (typeof IMAGE_MIMES)[number])) throw new Error('Unsupported image type');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Image too large (max 5 MB)');
  if (!sniffImageKind(file.buffer)) throw new Error('File content does not match an image format');
}

export function assertValidBuild(file: { mimetype: string; size: number; buffer: Buffer }): void {
  if (!BUILD_MIMES.includes(file.mimetype as (typeof BUILD_MIMES)[number])) throw new Error('Builds must be .zip');
  if (file.size > MAX_BUILD_BYTES) throw new Error('Build too large (max 500 MB)');
  if (!isZip(file.buffer)) throw new Error('File content is not a zip archive');
}
