/**
 * Subscription email notifications using nodemailer SMTP.
 */

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT ?? "465", 10),
  secure: true,
  auth: {
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
  },
});

const FROM = process.env.SMTP_FROM ?? "6URE Support <contact@6ureleaks.com>";

function wrap(title: string, body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="margin:0;padding:0;background:#0d0d14;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
<div style="text-align:center;margin-bottom:24px;"><span style="font-size:24px;font-weight:800;color:#a855f7;">6URE</span></div>
<div style="background:#15151e;border:1px solid #2a2a3a;border-radius:16px;padding:32px;color:#ccc;font-size:15px;line-height:1.7;">
<h2 style="color:#fff;margin:0 0 16px;font-size:20px;">${title}</h2>
${body}
</div>
<p style="text-align:center;color:#555;font-size:12px;margin-top:24px;">© 6URE · <a href="https://6ureleaks.com" style="color:#888;">6ureleaks.com</a></p>
</div></body></html>`;
}

export async function sendPaymentConfirmation(to: string, data: {
  planCategory: string; planInterval: string; amount: string; transactionId: string; date: string;
}) {
  const plan = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  const interval = data.planInterval.charAt(0) + data.planInterval.slice(1).toLowerCase();
  await transporter.sendMail({
    from: FROM, to, subject: `Payment Confirmed — ${plan} ${interval}`,
    html: wrap("Payment Confirmed ✓", `
      <p>Thank you for your payment!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#888;">Plan</td><td style="padding:8px 0;color:#fff;text-align:right;">${plan} ${interval}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Amount</td><td style="padding:8px 0;color:#4ade80;text-align:right;font-weight:700;">$${data.amount}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;color:#fff;text-align:right;">${data.date}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Transaction</td><td style="padding:8px 0;color:#fff;text-align:right;font-size:12px;">${data.transactionId}</td></tr>
      </table>
      <p>Enjoy your membership!</p>
    `),
  });
}

export async function sendRefundNotification(to: string, data: {
  planCategory: string; planInterval: string; refundAmount: string; originalAmount: string;
  transactionId: string; date: string; reason?: string;
}) {
  const plan = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  await transporter.sendMail({
    from: FROM, to, subject: `Refund Processed — $${data.refundAmount}`,
    html: wrap("Refund Processed", `
      <p>A refund has been processed for your ${plan} subscription.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#888;">Refunded</td><td style="padding:8px 0;color:#f87171;text-align:right;font-weight:700;">$${data.refundAmount}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Original</td><td style="padding:8px 0;color:#fff;text-align:right;">$${data.originalAmount}</td></tr>
        <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;color:#fff;text-align:right;">${data.date}</td></tr>
      </table>
      ${data.reason ? `<p style="color:#888;">Reason: ${data.reason}</p>` : ""}
      <p>The refund should appear in your account within 5-10 business days.</p>
    `),
  });
}

export async function sendCancellationConfirmation(to: string, data: {
  planCategory: string; planInterval: string;
}) {
  const plan = data.planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  const interval = data.planInterval.charAt(0) + data.planInterval.slice(1).toLowerCase();
  await transporter.sendMail({
    from: FROM, to, subject: `Subscription Cancelled — ${plan}`,
    html: wrap("Subscription Cancelled", `
      <p>Your <strong>${plan} ${interval}</strong> subscription has been cancelled.</p>
      <p>If you change your mind, you can always resubscribe at <a href="https://6ureleaks.com/membership" style="color:#a855f7;">6ureleaks.com/membership</a>.</p>
      <p style="color:#888;">We'd love to have you back!</p>
    `),
  });
}

export async function sendLeakProtectionInstructions(to: string, data: {
  planInterval: string;
}) {
  const interval = data.planInterval.charAt(0) + data.planInterval.slice(1).toLowerCase();
  await transporter.sendMail({
    from: FROM, to, subject: "Leak Protection — Setup Instructions",
    html: wrap("Leak Protection Setup", `
      <p>Thank you for subscribing to <strong>Leak Protection ${interval}</strong>!</p>
      <p>Follow these steps to get started:</p>
      <div style="background:#1a1a2e;border-radius:12px;padding:20px;margin:16px 0;">
        <p style="margin:0 0 12px;"><strong style="color:#a855f7;">1.</strong> Join our Discord server: <a href="https://discord.gg/6ure" style="color:#5865f2;">discord.gg/6ure</a></p>
        <p style="margin:0 0 12px;"><strong style="color:#a855f7;">2.</strong> Open a ticket in the server.</p>
        <p style="margin:0 0 12px;"><strong style="color:#a855f7;">3.</strong> Provide your <strong style="color:#fff;">TikTok profile link</strong> and <strong style="color:#fff;">Payhip or shop link</strong> you want protected.</p>
        <p style="margin:0;"><strong style="color:#a855f7;">4.</strong> Wait for a staff member to assist you.</p>
      </div>
      <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:12px 16px;margin-top:16px;">
        <p style="margin:0;color:#f87171;font-size:13px;">⚠️ We reserve the right to refuse service if you violate our server &amp; Discord rules. In such cases, you will receive a full refund.</p>
      </div>
    `),
  });
}
