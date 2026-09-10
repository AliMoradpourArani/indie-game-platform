// Background-job abstraction. Stage 0 runs inline (synchronous); a queue +
// workers (BullMQ/Redis) can be introduced later without touching callers.
export interface JobQueue {
  enqueue(name: string, payload: unknown): Promise<void>;
}

export class InlineJobRunner implements JobQueue {
  private readonly handlers = new Map<string, (payload: unknown) => Promise<void>>();

  on(name: string, handler: (payload: unknown) => Promise<void>): void {
    this.handlers.set(name, handler);
  }

  async enqueue(name: string, payload: unknown): Promise<void> {
    const handler = this.handlers.get(name);
    if (handler) await handler(payload);
    // No handler = accepted and dropped (logged by caller if needed).
  }
}
