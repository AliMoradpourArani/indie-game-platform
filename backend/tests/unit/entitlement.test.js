import { describe, expect, it } from 'vitest';
import { shouldGrantEntitlement, shouldRevokeAccess } from '../../src/modules/library/entitlement.js';
import { LocalTestPaymentProvider } from '../../src/infrastructure/payments/localTestProvider.js';
describe('purchase → entitlement rules', () => {
    it('grants library access only on COMPLETED', () => {
        expect(shouldGrantEntitlement('COMPLETED')).toBe(true);
        expect(shouldGrantEntitlement('PENDING')).toBe(false);
        expect(shouldGrantEntitlement('FAILED')).toBe(false);
        expect(shouldGrantEntitlement('REFUNDED')).toBe(false);
    });
    it('revokes download access on REFUNDED', () => {
        expect(shouldRevokeAccess('REFUNDED')).toBe(true);
        expect(shouldRevokeAccess('COMPLETED')).toBe(false);
    });
    it('local test provider is idempotent on idempotency key and single-use on approve', async () => {
        const provider = new LocalTestPaymentProvider();
        const input = { gameId: 'g1', buyerId: 'u1', amountCents: 999, currency: 'USD', idempotencyKey: 'k-1' };
        const first = await provider.createCheckout(input);
        const retry = await provider.createCheckout(input);
        expect(retry.checkoutId).toBe(first.checkoutId);
        const event = await provider.approveCheckout(first.checkoutId);
        expect(event.status).toBe('COMPLETED');
        expect(shouldGrantEntitlement(event.status)).toBe(true);
        await expect(provider.approveCheckout(first.checkoutId)).rejects.toThrow();
    });
});
//# sourceMappingURL=entitlement.test.js.map