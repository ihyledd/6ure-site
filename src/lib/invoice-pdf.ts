/**
 * Server-generated PDF receipt (for download; official records remain with PayPal).
 * Uses pdf-lib (bundles reliably in Next.js; PDFKit often breaks on font asset paths).
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PaymentRow, SubscriptionRow } from "@/lib/dal/subscriptions";
import { invoiceReference, planLabel } from "@/lib/invoice-html";

const LETTER_W = 612;
const LETTER_H = 792;
const MARGIN = 48;

export async function buildInvoicePdfBuffer(payment: PaymentRow, sub: SubscriptionRow): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([LETTER_W, LETTER_H]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  const inv = invoiceReference(payment);
  const dateStr = new Date(payment.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  /** Baseline Y from bottom; decreases as content flows downward. */
  let y = height - MARGIN;

  const centered = (text: string, size: number, f = fontBold, color = rgb(0.1, 0.1, 0.12)) => {
    const textWidth = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y: y - size, size, font: f, color });
    y -= size * 1.45;
  };

  const left = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.12)) => {
    page.drawText(text, { x: MARGIN, y: y - size, size, font: f, color });
    y -= size * 1.45;
  };

  centered("6ure — Receipt / Invoice", 18);
  centered(`Invoice #${inv}`, 9, font, rgb(0.23, 0.24, 0.26));
  centered(dateStr, 9, font, rgb(0.23, 0.24, 0.26));
  y -= 10;

  left("Bill to", 10, fontBold, rgb(0.19, 0.2, 0.22));
  const billLines = [payment.payer_name || sub.payer_name, payment.payer_email || sub.email].filter(Boolean);
  const billText = billLines.length > 0 ? billLines.join("\n") : "—";
  const billLineCount = billText.split("\n").length;
  page.drawText(billText, {
    x: MARGIN,
    y: y - 10,
    size: 10,
    font,
    color: rgb(0.1, 0.1, 0.12),
    lineHeight: 12,
  });
  y -= 10 + billLineCount * 12 + 8;

  left("Description", 10, fontBold, rgb(0.19, 0.2, 0.22));
  left(`${planLabel(sub.plan_category)} · ${sub.plan_interval}`, 10);
  y -= 6;

  left("Amount", 10, fontBold, rgb(0.19, 0.2, 0.22));
  page.drawText(`${payment.currency || "USD"} $${String(payment.amount)}`, {
    x: MARGIN,
    y: y - 16,
    size: 16,
    font: fontBold,
    color: rgb(0.14, 0.5, 0.27),
  });
  y -= 28;

  left(`Status: ${payment.status}`, 9, font, rgb(0.36, 0.37, 0.4));
  const tx = payment.paypal_transaction_id || payment.paypal_sale_id || "—";
  page.drawText(`Transaction reference: ${tx}`, {
    x: MARGIN,
    y: y - 9,
    size: 9,
    font,
    color: rgb(0.36, 0.37, 0.4),
    maxWidth: width - 2 * MARGIN,
  });
  y -= 24;

  page.drawText(
    "PayPal emails official receipts. This PDF is a supplementary record from 6ure for your files.",
    {
      x: MARGIN,
      y: y - 8,
      size: 8,
      font,
      color: rgb(0.45, 0.46, 0.49),
      maxWidth: width - 2 * MARGIN,
      lineHeight: 10,
    }
  );
  y -= 28;

  const footer = "6ureleaks.com · contact@6ureleaks.com";
  const fw = font.widthOfTextAtSize(footer, 8);
  page.drawText(footer, {
    x: (width - fw) / 2,
    y: y - 8,
    size: 8,
    font,
    color: rgb(0.45, 0.46, 0.49),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export function invoicePdfFilename(payment: PaymentRow): string {
  const short = invoiceReference(payment).slice(-8);
  return `6ure-receipt-${short}.pdf`;
}
