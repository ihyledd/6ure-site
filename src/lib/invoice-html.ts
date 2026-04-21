/**
 * Branded invoice / receipt HTML for subscription payments (email + print view).
 */

import type { PaymentRow, SubscriptionRow } from "@/lib/dal/subscriptions";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function planLabel(category: string): string {
  return category.replace(/_/g, " ");
}

/** Public invoice / receipt reference shown on PDF and HTML. */
export function invoiceReference(payment: PaymentRow): string {
  const raw = payment.id.replace(/[^a-zA-Z0-9]/g, "");
  return (raw.slice(-12) || payment.id.slice(-10)).toUpperCase();
}

/** Inner HTML for invoice body (inserted into email wrapper). */
export function buildInvoiceBodyHtml(payment: PaymentRow, sub: SubscriptionRow): string {
  const invNo = invoiceReference(payment);
  const dateStr = new Date(payment.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const billTo = [payment.payer_name || sub.payer_name, payment.payer_email || sub.email]
    .filter(Boolean)
    .map((x) => escapeHtml(String(x)))
    .join("<br/>");
  const tx = payment.paypal_transaction_id || payment.paypal_sale_id || "—";
  const status = escapeHtml(payment.status);
  const amount = escapeHtml(String(payment.amount));
  const currency = escapeHtml(payment.currency || "USD");
  const plan = escapeHtml(planLabel(sub.plan_category));
  const interval = escapeHtml(sub.plan_interval);

  return `
<h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fff;">Receipt / Invoice</h2>
<p style="margin:0 0 20px;font-size:13px;color:#72767d;">Invoice #${escapeHtml(invNo)} · ${escapeHtml(dateStr)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
<tr><td style="vertical-align:top;width:50%;padding-right:12px;">
<p style="margin:0 0 6px;font-size:11px;color:#72767d;text-transform:uppercase;letter-spacing:0.06em;">Bill to</p>
<p style="margin:0;font-size:14px;line-height:1.5;color:#e2e2e5;">${billTo || "—"}</p>
</td><td style="vertical-align:top;width:50%;padding-left:12px;">
<p style="margin:0 0 6px;font-size:11px;color:#72767d;text-transform:uppercase;letter-spacing:0.06em;">Status</p>
<p style="margin:0;font-size:14px;color:#57F287;font-weight:600;">${status}</p>
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(88,101,242,0.08);border:1px solid rgba(88,101,242,0.2);border-radius:12px;overflow:hidden;">
<tr><td colspan="2" style="padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
<p style="margin:0 0 4px;font-size:11px;color:#72767d;text-transform:uppercase;">Description</p>
<p style="margin:0;font-size:15px;color:#fff;font-weight:600;">${plan} · ${interval}</p>
</td></tr>
<tr><td style="padding:14px 16px;"><p style="margin:0;font-size:13px;color:#b9bbbe;">Amount</p></td>
<td style="padding:14px 16px;text-align:right;"><p style="margin:0;font-size:18px;color:#57F287;font-weight:700;">${currency} $${amount}</p></td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#72767d;line-height:1.5;">Transaction reference: <span style="color:#b9bbbe;word-break:break-all;">${escapeHtml(tx)}</span></p>
<p style="margin:12px 0 0;font-size:12px;color:#72767d;line-height:1.5;">PayPal also emails official receipts. This is a supplementary record from 6ure for your convenience.</p>`;
}

export function buildInvoicePlainText(payment: PaymentRow, sub: SubscriptionRow): string {
  const invNo = invoiceReference(payment);
  const lines = [
    `6ure — Receipt / Invoice #${invNo}`,
    `Date: ${new Date(payment.created_at).toISOString().slice(0, 10)}`,
    "",
    `Plan: ${planLabel(sub.plan_category)} (${sub.plan_interval})`,
    `Amount: ${payment.currency || "USD"} $${payment.amount}`,
    `Status: ${payment.status}`,
    `Transaction: ${payment.paypal_transaction_id || payment.paypal_sale_id || "—"}`,
    "",
    "Thank you for your support.",
    "https://6ureleaks.com",
  ];
  return lines.join("\n");
}

const PRINT_TOOLBAR = `<div class="invoice-print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:9999;padding:12px 16px;background:#111113;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;font-family:system-ui,-apple-system,sans-serif;">
<button type="button" class="invoice-print-btn" onclick="window.print()" style="padding:10px 18px;border-radius:8px;background:#5865f2;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;">Print or save as PDF</button>
<span style="color:#72767d;font-size:13px;max-width:420px;text-align:center;">In the print dialog, choose <strong style="color:#b9bbbe;">Save as PDF</strong> to download.</span>
</div><div style="height:52px" aria-hidden="true"></div>`;

const PRINT_CSS = `<style>
  @media print {
    .invoice-print-toolbar, .invoice-print-toolbar + div[aria-hidden] { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>`;

/** Adds a print bar + optional auto-print for the HTML invoice view (not for emails). */
export function enhanceInvoiceHtmlForBrowser(html: string, autoPrint: boolean): string {
  const withHead = html.includes("</head>")
    ? html.replace("</head>", `${PRINT_CSS}</head>`)
    : html;
  const script = autoPrint
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},450);});</script>`
    : "";
  if (withHead.includes("</body>")) {
    return withHead.replace("</body>", `${PRINT_TOOLBAR}${script}</body>`);
  }
  return `${withHead}${PRINT_TOOLBAR}${script}`;
}
