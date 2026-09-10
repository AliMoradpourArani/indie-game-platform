import type { PrismaClient } from '@prisma/client';
import { Errors } from '../../common/errors.js';
import { LocalTestPaymentProvider, type PaymentProvider } from '../../infrastructure/payments/localTestProvider.js';
import { shouldGrantEntitlement } from '../library/entitlement.js';

// Singleton provider for Stage 0 (in-process). A real PSP would be request-scoped
// with persisted checkout state; the interface already supports that swap.
let provider: PaymentProvider | null = null;

export function paymentProvider(): PaymentProvider {
  if (!provider) provider = new LocalTestPaymentProvider();
  return provider;
}

interface Deps {
  db: PrismaClient;
}

async function publishedOrThrow(db: PrismaClient, gameId: string) {
  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw Errors.notFound('Game not found');
  const latest = await db.submission.findFirst({ where: { gameId }, orderBy: { updatedAt: 'desc' } });
  if (!latest || latest.state !== 'PUBLISHED') throw Errors.notFound('Game not found');
  return game;
}

/**
 * Starts a purchase. Idempotent on Idempotency-Key: retried checkouts return the
 * original record instead of double-charging. Free games complete immediately.
 */
export async function checkout(deps: Deps, buyerId: string, gameId: string, idempotencyKey: string) {
  const game = await publishedOrThrow(deps.db, gameId);

  const existing = await deps.db.purchase.findUnique({ where: { idempotencyKey } });
  if (existing) return { purchase: existing, checkoutId: null as string | null };

  if (game.priceCents === 0) {
    const purchase = await deps.db.purchase.create({
      data: {
        buyerId, gameId, amountCents: 0, currency: game.currency,
        status: 'COMPLETED', providerRef: `free_${gameId}_${buyerId}`, idempotencyKey,
      },
    });
    await grantEntitlement(deps.db, buyerId, gameId, purchase.id);
    return { purchase, checkoutId: null as string | null };
  }

  const co = await paymentProvider().createCheckout({
    gameId, buyerId, amountCents: game.priceCents, currency: game.currency, idempotencyKey,
  });
  const purchase = await deps.db.purchase.create({
    data: {
      buyerId, gameId, amountCents: game.priceCents, currency: game.currency,
      status: 'PENDING', providerRef: co.checkoutId, idempotencyKey,
    },
  });
  return { purchase, checkoutId: co.checkoutId };
}

/**
 * Confirms payment. The verdict comes from provider verification — never from
 * the frontend's claim. Grants exactly one entitlement per (user, game).
 */
export async function confirmPurchase(deps: Deps, buyerId: string, checkoutId: string) {
  const purchase = await deps.db.purchase.findFirst({ where: { providerRef: checkoutId, buyerId } });
  if (!purchase) throw Errors.notFound('Checkout not found');
  if (purchase.status === 'COMPLETED') return purchase; // already confirmed

  const event = await paymentProvider().approveCheckout(checkoutId);
  const updated = await deps.db.purchase.update({
    where: { id: purchase.id },
    data: { status: event.status, providerRef: event.providerRef },
  });
  if (shouldGrantEntitlement(event.status)) {
    await grantEntitlement(deps.db, buyerId, purchase.gameId, purchase.id);
  }
  return updated;
}

async function grantEntitlement(db: PrismaClient, userId: string, gameId: string, purchaseId: string) {
  await db.entitlement.upsert({
    where: { userId_gameId: { userId, gameId } },
    update: {},
    create: { userId, gameId, purchaseId },
  });
  await db.auditLog.create({
    data: { actorId: userId, action: 'entitlement.granted', entityType: 'game', entityId: gameId, diff: { purchaseId } },
  });
}

export async function myLibrary(db: PrismaClient, userId: string) {
  return db.entitlement.findMany({
    where: { userId },
    orderBy: { grantedAt: 'desc' },
    include: { game: { select: { id: true, slug: true, title: true, genre: true, coverKey: true } } },
  });
}
