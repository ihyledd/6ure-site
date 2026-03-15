/**
 * Application accepted email - sends from contact@6ureleaks.com via SMTP (Namecheap)
 * or Resend. Uses the same setup as about.6ureleaks.com for consistent deliverability.
 *
 * Env vars (SMTP - preferred, same as about site):
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM (default: contact@6ureleaks.com)
 *   EMAIL_FROM_NAME (default: 6ure)
 *
 * Or Resend fallback:
 *   RESEND_API_KEY, EMAIL_FROM
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.EMAIL_FROM ?? "contact@6ureleaks.com";
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? "6ure";

function buildEmailContent(
  applicantName: string,
  formTitle: string
): { subject: string; text: string; html: string } {
  const title = formTitle || "Application";
  const subject = `${title} – Accepted`;
  const text = `Congratulations! You've been accepted for ${title}.

We will be in touch with next steps. Welcome to the team!

- 6ure

---
This email was sent because you applied at 6ureleaks.com. Questions? Reply to contact@6ureleaks.com`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)} – Accepted</title>
<style type="text/css">
:root{color-scheme:dark}
@media (prefers-color-scheme:dark){
  .card-wrap{background-color:#0a0a0b!important}
  .card-inner{background-color:#111113!important;border-color:rgba(255,255,255,0.08)!important}
  .card-body{background-color:#111113!important}
  .text-primary{color:#e2e2e5!important}
  .text-secondary{color:#b9bbbe!important}
  .text-muted{color:#72767d!important}
}
</style>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#0a0a0b;color:#e2e2e5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card-wrap" style="background:#0a0a0b;">
<tr><td style="padding:32px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="card-inner" style="max-width:560px;margin:0 auto;background:#111113;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
<tr><td style="padding:20px 24px;background:linear-gradient(135deg, #5865f2 0%, #7c3aed 100%);text-align:center;">
<img src="https://images.6ureleaks.com/logos/Untitled10.png" alt="6ure" width="80" height="80" style="display:block;margin:0 auto 8px;border-radius:12px;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em;">6ure</h1>
</td></tr>
<tr><td class="card-body" style="padding:32px 24px;background:#111113;">
<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#fff;">${escapeHtml(title)} – Accepted</h2>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#b9bbbe;">Hi ${escapeHtml(applicantName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#b9bbbe;">Congratulations! You've been accepted for ${escapeHtml(title)}.</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#b9bbbe;">We will be in touch with next steps. Welcome to the team!</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
<tr><td>
<a href="mailto:contact@6ureleaks.com" title="Email us" style="display:inline-block;text-decoration:none;color:#5865f2;margin-right:16px;">Email us</a>
<a href="https://discord.gg/6ure" title="Join our Discord" style="display:inline-block;text-decoration:none;color:#5865f2;">Discord</a>
</td></tr>
</table>
<p style="margin:24px 0 0;font-size:14px;color:#72767d;">- 6ure</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#72767d;">This email was sent because you applied at <a href="https://6ureleaks.com" style="color:#5865f2;text-decoration:none;">6ureleaks.com</a>. Questions? Reply to contact@6ureleaks.com</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendViaSmtp(
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

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to.trim(),
      replyTo: "contact@6ureleaks.com",
      subject,
      text,
      html,
      headers: {
        "X-Mailer": "6ure",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "Resend not configured" };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to.trim(),
      replyTo: "contact@6ureleaks.com",
      subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function sendApplicationAcceptedEmail(
  to: string,
  applicantName?: string,
  formTitle?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!to || typeof to !== "string" || !to.includes("@")) {
    return { ok: false, error: "Invalid email address" };
  }

  const name = applicantName?.trim() || "Applicant";
  const title = formTitle?.trim() || "Your application";
  const { subject, text, html } = buildEmailContent(name, title);

  // Prefer SMTP (same as about.6ureleaks.com) for better deliverability from contact@6ureleaks.com
  if (process.env.SMTP_HOST) {
    return sendViaSmtp(to, subject, text, html);
  }

  return sendViaResend(to, subject, html);
}
