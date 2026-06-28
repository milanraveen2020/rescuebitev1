import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export interface OrderEmailData {
  email: string;
  name: string;
  storeName: string;
  listingTitle: string;
  quantity: number;
  totalMinor: number;
  currency: string;
  pickupCode: string;
  pickupWindow: string;
}

/**
 * Transactional email via Resend. When RESEND_API_KEY is unset (local dev) the
 * rendered email is logged instead of sent, so every flow is exercisable without
 * an API key. All bodies use one branded HTML layout.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: AppConfigService) {}

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const link = `${this.config.appWebUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Reset your RescueBite password',
      html: layout(
        'Reset your password',
        `<p>We received a request to reset your password. This link expires shortly.</p>
         ${button('Reset password', link)}
         <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
      ),
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const link = `${this.config.appWebUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send({
      to: email,
      subject: 'Verify your RescueBite email',
      html: layout(
        'Confirm your email',
        `<p>Welcome to RescueBite! Confirm your email to get started rescuing surplus food.</p>
         ${button('Verify email', link)}`,
      ),
    });
  }

  async sendOrderConfirmation(data: OrderEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: `Your RescueBite order is confirmed — code ${data.pickupCode}`,
      html: layout(
        'Order confirmed 🎉',
        `<p>Hi ${escape(data.name)}, your surprise bag is reserved. Show this code at pickup:</p>
         <div style="margin:24px 0;text-align:center">
           <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:6px;color:#15803d;background:#f0fdf4;border-radius:12px;padding:16px 28px">${escape(data.pickupCode)}</span>
         </div>
         ${receiptTable(data)}
         <p style="color:#6b7280;font-size:13px">Pickup window: ${escape(data.pickupWindow)}</p>`,
      ),
    });
  }

  async sendRefundNotice(data: OrderEmailData): Promise<void> {
    await this.send({
      to: data.email,
      subject: 'Your RescueBite order was refunded',
      html: layout(
        'Refund issued',
        `<p>Hi ${escape(data.name)}, we've refunded your order for <strong>${escape(data.listingTitle)}</strong> at ${escape(data.storeName)}.</p>
         ${receiptTable(data)}
         <p style="color:#6b7280;font-size:13px">Refunds typically take 5–10 business days to appear.</p>`,
      ),
    });
  }

  async sendStoreApprovalResult(args: {
    email: string;
    name: string;
    storeName: string;
    approved: boolean;
    reason?: string;
  }): Promise<void> {
    const body = args.approved
      ? `<p>Great news, ${escape(args.name)} — <strong>${escape(args.storeName)}</strong> has been approved on RescueBite. You can now publish surprise bags and start rescuing food.</p>
         ${button('Open your dashboard', this.config.appWebUrl)}`
      : `<p>Hi ${escape(args.name)}, after review we're unable to approve <strong>${escape(args.storeName)}</strong> at this time.</p>
         ${args.reason ? `<p style="background:#fef2f2;border-radius:8px;padding:12px;color:#991b1b">${escape(args.reason)}</p>` : ''}
         <p>You can update your store details and reapply.</p>`;
    await this.send({
      to: args.email,
      subject: args.approved ? 'Your RescueBite store is approved' : 'About your RescueBite store',
      html: layout(args.approved ? 'You’re approved! 🎉' : 'Store application update', body),
    });
  }

  /** Send via Resend, or log in dev when no API key is configured. */
  private async send({ to, subject, html }: SendArgs): Promise<void> {
    const apiKey = this.config.resendApiKey;
    if (!apiKey) {
      this.logger.warn(`[email:dev] To ${to} — ${subject}`);
      return;
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: this.config.emailFrom, to, subject, html }),
      });
      if (!response.ok) {
        this.logger.error(`Resend failed (${response.status}) for ${to}: ${await response.text()}`);
      }
    } catch (error) {
      // Never let a transactional email failure bubble into the caller.
      this.logger.error(
        `Resend request error for ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

// --- HTML helpers (inline styles for email-client compatibility) ------------

function layout(heading: string, inner: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8faf9;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:#15803d;padding:20px 28px">
        <span style="color:#fff;font-size:20px;font-weight:700">RescueBite</span>
      </div>
      <div style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;color:#111827">${heading}</h1>
        <div style="font-size:15px;line-height:1.6;color:#374151">${inner}</div>
      </div>
      <div style="padding:16px 28px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center">
        Rescuing surplus food, one bag at a time.
      </div>
    </div>
  </div>`;
}

function button(label: string, href: string): string {
  return `<div style="margin:24px 0">
    <a href="${escape(href)}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${escape(label)}</a>
  </div>`;
}

function receiptTable(data: OrderEmailData): string {
  return `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <tr><td style="padding:6px 0;color:#6b7280">Store</td><td style="padding:6px 0;text-align:right;color:#111827">${escape(data.storeName)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280">Item</td><td style="padding:6px 0;text-align:right;color:#111827">${data.quantity}× ${escape(data.listingTitle)}</td></tr>
    <tr><td style="padding:6px 0;color:#6b7280;border-top:1px solid #e5e7eb">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#111827;border-top:1px solid #e5e7eb">${formatMoney(data.totalMinor, data.currency)}</td></tr>
  </table>`;
}

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-LK', { style: 'currency', currency }).format(
      amountMinor / 100,
    );
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

/** Minimal HTML escaping for interpolated, user-controlled strings. */
function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
