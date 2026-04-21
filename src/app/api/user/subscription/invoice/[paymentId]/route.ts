/**
 * GET — HTML receipt for print / save
 * POST { "sendEmail": true } — email branded copy (SMTP)
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPaymentById, getSubscriptionById } from "@/lib/dal/subscriptions";
import { subscriptionEmailWrapper, sendInvoiceCopyEmail } from "@/lib/send-subscription-email";
import { buildInvoiceBodyHtml, enhanceInvoiceHtmlForBrowser } from "@/lib/invoice-html";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth();
  const discordId = session?.user?.id;
  if (!discordId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { paymentId } = await params;
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const sub = await getSubscriptionById(payment.subscription_id);
  if (!sub || sub.user_id !== discordId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const title = `Receipt — ${payment.id.slice(-8)} — 6ure`;
  const baseHtml = subscriptionEmailWrapper(title, buildInvoiceBodyHtml(payment, sub));
  const url = new URL(request.url);
  const autoPrint = url.searchParams.get("print") === "1";
  const html = enhanceInvoiceHtmlForBrowser(baseHtml, autoPrint);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await auth();
  const discordId = session?.user?.id;
  if (!discordId) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: { sendEmail?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty */
  }
  if (!body.sendEmail) {
    return NextResponse.json({ error: "sendEmail: true required" }, { status: 400 });
  }

  const { paymentId } = await params;
  const payment = await getPaymentById(paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const sub = await getSubscriptionById(payment.subscription_id);
  if (!sub || sub.user_id !== discordId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const to = payment.payer_email?.trim() || sub.email?.trim();
  if (!to) {
    return NextResponse.json(
      {
        error:
          "No payer email on file for this payment. Check your PayPal account for official receipts, or contact support.",
      },
      { status: 400 }
    );
  }

  const result = await sendInvoiceCopyEmail(to, payment, sub);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Email could not be sent" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, sentTo: to });
}
