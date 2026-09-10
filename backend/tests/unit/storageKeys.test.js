import { describe, expect, it } from 'vitest';
import { buildGameKey, resolveKey } from '../../src/infrastructure/storage/localStorage.js';
describe('storage keys', () => {
    it('builds safe server-side keys and rejects unsafe filenames', () => {
        expect(buildGameKey('g1', '1.0.0', 'WINDOWS', 'demo.zip')).toBe('games/g1/1.0.0/windows/demo.zip');
        expect(() => buildGameKey('g1', '1.0', 'WINDOWS', '..')).toThrow();
        const key = buildGameKey('../../etc', '1.0', 'WINDOWS', 'a.zip');
        const segments = key.split('/');
        expect(segments).not.toContain('..');
        expect(segments).not.toContain('.');
        // Belt and suspenders: the built key must still resolve inside the root.
        expect(() => resolveKey('/srv/storage', key)).not.toThrow();
    });
    it('resolveKey blocks path traversal escapes', () => {
        const root = process.platform === 'win32' ? 'C:\\srv\\storage' : '/srv/storage';
        expect(() => resolveKey(root, '../../etc/passwd')).toThrow();
        expect(() => resolveKey(root, 'games/g1/file.zip')).not.toThrow();
    });
});
//# sourceMappingURL=storageKeys.test.js.map