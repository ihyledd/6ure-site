/**
 * Subscription email notifications.
 * Uses the same SMTP pattern as send-application-email.ts.
 */

import nodemailer from "nodemailer";
import type { PaymentRow, SubscriptionRow } from "@/lib/dal/subscriptions";
import { buildInvoiceBodyHtml, buildInvoicePlainText, planLabel } from "@/lib/invoice-html";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "contact@6ureleaks.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "6ure";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function subscriptionEmailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0a0b;color:#e2e2e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0b;">
<tr><td style="padding:32px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#111113;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:20px 24px;background:linear-gradient(135deg, #5865f2 0%, #7c3aed 100%);text-align:center;">
<img src="https://images.6ureleaks.com/logos/Untitled10.png" alt="6ure" width="80" height="80" style="display:block;margin:0 auto 8px;border-radius:12px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">6ure</h1>
</td></tr>
<tr><td style="padding:32px 24px;background:#111113;">
${body}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#72767d;">This email was sent by <a href="https://6ureleaks.com" style="color:#5865f2;text-decoration:none;">6ureleaks.com</a>. Questions? Contact <a href="mailto:contact@6ureleaks.com" style="color:#5865f2;text-decoration:none;">contact@6ureleaks.com</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  if (!host) return { ok: false, error: "SMTP not configured" };

  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = process.env.SMTP_SECURE === "ssl";
  const user = process.env.SMTP_USER ?? FROM_EMAIL;
  const pass = process.env.SMTP_PASS;
  if (!pass) return { ok: false, error: "SMTP_PASS not set" };

  const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to.trim(),
      replyTo: "contact@6ureleaks.com",
      subject,
      text,
      html,
      headers: { "X-Mailer": "6ure", "X-Auto-Response-Suppress": "OOF, AutoReply" },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Payment confirmation
// ---------------------------------------------------------------------------

export async function sendPaymentConfirmation(
  to: string,
  planName: string,
  amount: string,
  interval: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Payment Confirmation — ${planName} ${interval}`;
  const text = `Your payment for ${planName} (${interval}) has been confirmed.\n\nAmount: $${amount}\n\nThank you for subscribing!\n\n- 6ure`;
  const html = subscriptionEmailWrapper(subject, `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#fff;">Payment Confirmed ✓</h2>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#b9bbbe;">Your payment has been successfully processed.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:rgba(88,101,242,0.1);border:1px solid rgba(88,101,242,0.2);border-radius:12px;padding:16px;">
<tr><td style="padding:12px 16px;">
<p style="margin:0 0 8px;font-size:13px;color:#72767d;text-transform:uppercase;letter-spacing:0.05em;">Plan</p>
<p style="margin:0;font-size:16px;color:#fff;font-weight:600;">${escapeHtml(planName)} — ${escapeHtml(interval)}</p>
</td></tr>
<tr><td style="padding:0 16px 12px;">
<p style="margin:0 0 8px;font-size:13px;color:#72767d;text-transform:uppercase;letter-spacing:0.05em;">Amount</p>
<p style="margin:0;font-size:16px;color:#57F287;font-weight:600;">$${escapeHtml(amount)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:14px;color:#72767d;">- 6ure</p>`);

  return sendEmail(to, subject, text, html);
}

// ---------------------------------------------------------------------------
// Cancellation confirmation
// ---------------------------------------------------------------------------

export async function sendCancellationConfirmation(
  to: string,
  planName: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Subscription Cancelled — ${planName}`;
  const text = `Your ${planName} subscription has been cancelled.\n\nIf you change your mind, you can resubscribe at any time at https://6ureleaks.com/membership\n\n- 6ure`;
  const html = subscriptionEmailWrapper(subject, `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#fff;">Subscription Cancelled</h2>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#b9bbbe;">Your <strong>${escapeHtml(planName)}</strong> subscription has been cancelled.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#b9bbbe;">If you change your mind, you can resubscribe at any time.</p>
<a href="https://6ureleaks.com/membership" style="display:inline-block;padding:12px 24px;background:#5865f2;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Resubscribe</a>
<p style="margin:24px 0 0;font-size:14px;color:#72767d;">- 6ure</p>`);

  return sendEmail(to, subject, text, html);
}

// ---------------------------------------------------------------------------
// Refund notification
// ---------------------------------------------------------------------------

export async function sendRefundNotification(
  to: string,
  planName: string,
  amount: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Refund Processed — ${planName}`;
  const text = `A refund of $${amount} for your ${planName} subscription has been processed.\n\nThe refund should appear in your account within 5-10 business days.\n\n- 6ure`;
  const html = subscriptionEmailWrapper(subject, `
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#fff;">Refund Processed</h2>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#b9bbbe;">A refund has been issued for your <strong>${escapeHtml(planName)}</strong> subscription.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;background:rgba(237,66,69,0.1);border:1px solid rgba(237,66,69,0.2);border-radius:12px;padding:16px;">
<tr><td style="padding:12px 16px;">
<p style="margin:0 0 8px;font-size:13px;color:#72767d;text-transform:uppercase;letter-spacing:0.05em;">Refund Amount</p>
<p style="margin:0;font-size:16px;color:#ED4245;font-weight:600;">$${escapeHtml(amount)}</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#b9bbbe;">The refund should appear in your account within 5-10 business days.</p>
<p style="margin:24px 0 0;font-size:14px;color:#72767d;">- 6ure</p>`);

  return sendEmail(to, subject, text, html);
}

// ---------------------------------------------------------------------------
// Invoice / receipt (account page)
// ---------------------------------------------------------------------------

export async function sendInvoiceCopyEmail(
  to: string,
  payment: PaymentRow,
  sub: SubscriptionRow
): Promise<{ ok: boolean; error?: string }> {
  const subject = `Receipt / Invoice — ${planLabel(sub.plan_category)} — 6ure`;
  const text = buildInvoicePlainText(payment, sub);
  const html = subscriptionEmailWrapper(subject, buildInvoiceBodyHtml(payment, sub));
  return sendEmail(to.trim(), subject, text, html);
}
