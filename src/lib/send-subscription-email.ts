/**
 * Email service for subscription-related notifications.
 * Uses SMTP via nodemailer with contact@6ureleaks.com.
 *
 * Env vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SMTP_FROM (default: contact@6ureleaks.com)
 */

import nodemailer from "nodemailer";

const FROM = process.env.SMTP_FROM ?? "contact@6ureleaks.com";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS ?? "",
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Generic send helper                                                */
/* ------------------------------------------------------------------ */

async function sendEmail(to: string, subject: string, html: string) {
  if (!to) {
    console.warn("[Email] No recipient given, skipping");
    return;
  }
  try {
    const transporter = getTransporter();
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[Email] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error("[Email] Failed to send:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Styled email wrapper                                               */
/* ------------------------------------------------------------------ */

function wrap(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#15151e;border-radius:16px;border:1px solid #2a2a3a;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#6c5ce7,#a855f7);padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${title}</h1>
    </div>
    <div style="padding:32px;color:#e0e0e8;font-size:15px;line-height:1.7;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #2a2a3a;text-align:center;">
      <p style="margin:0;color:#666;font-size:12px;">6URE &mdash; <a href="https://6ureleaks.com" style="color:#a855f7;text-decoration:none;">6ureleaks.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Payment confirmation                                               */
/* ------------------------------------------------------------------ */

export async function sendPaymentConfirmation(
  to: string,
  data: {
    planCategory: string;
    planInterval: string;
    amount: string;
    transactionId?: string;
    date: string;
  }
) {
  const planName = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  const interval = data.planInterval.charAt(0) + data.planInterval.slice(1).toLowerCase();

  await sendEmail(
    to,
    `Payment Confirmed — ${planName} ${interval}`,
    wrap(
      "Payment Confirmed ✓",
      `
      <p>Your payment has been successfully processed.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#888;">Plan</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600;">${planName} ${interval}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Amount</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600;">$${data.amount} USD</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;text-align:right;color:#fff;">${data.date}</td></tr>
        ${data.transactionId ? `<tr><td style="padding:8px 0;color:#888;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#fff;font-family:monospace;font-size:13px;">${data.transactionId}</td></tr>` : ""}
      </table>
      <p style="color:#888;">Thank you for your support!</p>
    `
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Refund notification                                                */
/* ------------------------------------------------------------------ */

export async function sendRefundNotification(
  to: string,
  data: {
    planCategory: string;
    planInterval: string;
    refundAmount: string;
    originalAmount: string;
    reason?: string;
    transactionId?: string;
    date: string;
  }
) {
  const planName = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";

  await sendEmail(
    to,
    `Refund Processed — ${planName}`,
    wrap(
      "Refund Processed",
      `
      <p>A refund has been issued for your subscription.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#888;">Plan</td><td style="padding:8px 0;text-align:right;color:#fff;font-weight:600;">${planName}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Refund Amount</td><td style="padding:8px 0;text-align:right;color:#4ade80;font-weight:600;">$${data.refundAmount} USD</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Original Amount</td><td style="padding:8px 0;text-align:right;color:#fff;">$${data.originalAmount} USD</td></tr>
        ${data.reason ? `<tr><td style="padding:8px 0;color:#888;">Reason</td><td style="padding:8px 0;text-align:right;color:#fff;">${data.reason}</td></tr>` : ""}
        ${data.transactionId ? `<tr><td style="padding:8px 0;color:#888;">Transaction ID</td><td style="padding:8px 0;text-align:right;color:#fff;font-family:monospace;font-size:13px;">${data.transactionId}</td></tr>` : ""}
        <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;text-align:right;color:#fff;">${data.date}</td></tr>
      </table>
      <p style="color:#888;">The refund will appear in your PayPal account within 5-10 business days.</p>
    `
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Subscription cancelled                                             */
/* ------------------------------------------------------------------ */

export async function sendCancellationConfirmation(
  to: string,
  data: {
    planCategory: string;
    planInterval: string;
    endDate?: string;
  }
) {
  const planName = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";

  await sendEmail(
    to,
    `Subscription Cancelled — ${planName}`,
    wrap(
      "Subscription Cancelled",
      `
      <p>Your ${planName} subscription has been cancelled.</p>
      ${data.endDate ? `<p>You will continue to have access until <strong style="color:#fff;">${data.endDate}</strong>.</p>` : ""}
      <p style="color:#888;">If you change your mind, you can re-subscribe at any time from our <a href="https://6ureleaks.com/membership" style="color:#a855f7;">membership page</a>.</p>
    `
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Leak Protection instructions (sent by admin from dashboard)        */
/* ------------------------------------------------------------------ */

export async function sendLeakProtectionInstructions(
  to: string,
  data: {
    planInterval: string;
  }
) {
  const interval = data.planInterval.charAt(0) + data.planInterval.slice(1).toLowerCase();

  await sendEmail(
    to,
    "Leak Protection — Setup Instructions",
    wrap(
      "Leak Protection Setup Instructions",
      `
      <p>Thank you for subscribing to <strong style="color:#fff;">Leak Protection ${interval}</strong>!</p>
      <p>Follow these steps to get started:</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin:16px 0;">
        <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
          <span style="background:#6c5ce7;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-right:12px;flex-shrink:0;">1</span>
          <span><strong style="color:#fff;">Join our Discord server</strong> if you haven't already. <a href="https://discord.gg/6ure" style="color:#5865f2;">Join Discord →</a></span>
        </div>
        <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
          <span style="background:#6c5ce7;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-right:12px;flex-shrink:0;">2</span>
          <span><strong style="color:#fff;">Open a ticket</strong> in the server.</span>
        </div>
        <div style="display:flex;align-items:flex-start;margin-bottom:16px;">
          <span style="background:#6c5ce7;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-right:12px;flex-shrink:0;">3</span>
          <span><strong style="color:#fff;">Provide these in your ticket:</strong><br/>• Your <strong>TikTok profile link</strong><br/>• Your <strong>Payhip or shop link</strong> that you want to be protected</span>
        </div>
        <div style="display:flex;align-items:flex-start;">
          <span style="background:#6c5ce7;color:#fff;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-right:12px;flex-shrink:0;">4</span>
          <span><strong style="color:#fff;">Wait for a staff member</strong> to assist you with more information.</span>
        </div>
      </div>
      <div style="background:#2a1a1a;border:1px solid #4a2a2a;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;color:#f87171;font-size:13px;">⚠️ <strong>Note:</strong> We reserve the right to refuse service if you violate our server &amp; Discord rules. In such cases, you will receive a full refund.</p>
      </div>
    `
    )
  );
}
