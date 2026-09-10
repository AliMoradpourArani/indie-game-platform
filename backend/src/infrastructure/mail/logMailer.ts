import type { logger as _logger } from '../../common/logger.js';

export interface Mailer {
  send(to: string, template: string, data: unknown): Promise<void>;
}

/** Stage 0: log instead of sending. Future: SMTP / transactional ESP. */
export class LogMailer implements Mailer {
  constructor(private readonly log: Pick<typeof _logger, 'info'>) {}
  async send(to: string, template: string, data: unknown): Promise<void> {
    this.log.info({ to, template, data }, 'Mail (logged, not sent)');
  }
}
