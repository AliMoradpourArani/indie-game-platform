// Purchase → Entitlement derivation (pure rules, unit-tested).
// A successful purchase grants exactly one entitlement per (user, game).
export type PurchaseStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

/** Only COMPLETED purchases grant library access. Never trust the frontend. */
export function shouldGrantEntitlement(status: PurchaseStatus): boolean {
  return status === 'COMPLETED';
}

/** Refunds revoke future download access but purchase history is append-only. */
export function shouldRevokeAccess(status: PurchaseStatus): boolean {
  return status === 'REFUNDED';
}
