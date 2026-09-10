import { describe, expect, it } from 'vitest';
import { createDownloadToken, verifyDownloadToken } from '../../src/modules/downloads/tokens.js';
const SECRET = 'test-secret-min-16-chars';
describe('download tokens', () => {
    it('round-trips valid claims', () => {
        const exp = Math.floor(Date.now() / 1000) + 600;
        const token = createDownloadToken({ userId: 'u1', buildId: 'b1', exp }, SECRET);
        expect(verifyDownloadToken(token, SECRET)).toMatchObject({ userId: 'u1', buildId: 'b1' });
    });
    it('rejects expired and tampered tokens', () => {
        const past = Math.floor(Date.now() / 1000) - 10;
        const expired = createDownloadToken({ userId: 'u1', buildId: 'b1', exp: past }, SECRET);
        expect(() => verifyDownloadToken(expired, SECRET)).toThrow(/expired/);
        const fresh = createDownloadToken({ userId: 'u1', buildId: 'b1', exp: past + 100000 }, SECRET);
        const tampered = fresh.slice(0, -2) + 'xx';
        expect(() => verifyDownloadToken(tampered, SECRET)).toThrow();
        expect(() => verifyDownloadToken('not-a-token', SECRET)).toThrow();
    });
});
//# sourceMappingURL=downloadTokens.test.js.map