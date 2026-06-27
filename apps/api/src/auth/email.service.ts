import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';

/**
 * Transactional email. There is no provider wired up yet, so in development this
 * logs the action links to the server console. Swap the body of these methods for
 * a real provider (Resend/SES/Postmark) without changing callers.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: AppConfigService) {}

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const link = `${this.config.appWebUrl}/verify-email?token=${encodeURIComponent(token)}`;
    this.logger.warn(`[email] Verify ${email}: ${link}`);
    return Promise.resolve();
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.config.appWebUrl}/reset-password?token=${encodeURIComponent(token)}`;
    this.logger.warn(`[email] Password reset ${email}: ${link}`);
    return Promise.resolve();
  }
}
