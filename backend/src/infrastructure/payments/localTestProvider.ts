// Payment abstraction — frontend NEVER declares success; confirmation comes from
// trusted backend/provider verification. Stage 0: simulated local provider.
export interface CreateCheckoutInput {
  gameId: string;
  buyerId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
}

export interface Checkout {
  checkoutId: string;
  amountCents: number;
  currency: string;
}

export type PaymentEventStatus = 'COMPLETED' | 'FAILED';

export interface PaymentEvent {
  providerRef: string;
  status: PaymentEventStatus;
}

export interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<Checkout>;
  /** Simulates the buyer approving the checkout (local only — no real money). */
  approveCheckout(checkoutId: string): Promise<PaymentEvent>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>;
}

export class LocalTestPaymentProvider implements PaymentProvider {
  private readonly checkouts = new Map<string, CreateCheckoutInput & { used: boolean }>();
  private counter = 0;

  async createCheckout(input: CreateCheckoutInput): Promise<Checkout> {
    // Idempotent by idempotencyKey: same key returns the original checkout.
    for (const [id, existing] of this.checkouts) {
      if (existing.idempotencyKey === input.idempotencyKey) {
        return { checkoutId: id, amountCents: existing.amountCents, currency: existing.currency };
      }
    }
    const checkoutId = `test_checkout_${++this.counter}`;
    this.checkouts.set(checkoutId, { ...input, used: false });
    return { checkoutId, amountCents: input.amountCents, currency: input.currency };
  }

  async approveCheckout(checkoutId: string): Promise<PaymentEvent> {
    const found = this.checkouts.get(checkoutId);
    if (!found) throw new Error('Unknown checkout');
    if (found.used) throw new Error('Checkout already consumed (idempotency)');
    found.used = true;
    return { providerRef: `test_pay_${checkoutId}`, status: 'COMPLETED' };
  }

  async verifyWebhook(rawBody: Buffer, _signature: string): Promise<PaymentEvent> {
    // Local stub: real PSPs verify HMAC signatures here (StripePaymentProvider later).
    return JSON.parse(rawBody.toString('utf8')) as PaymentEvent;
  }
}
