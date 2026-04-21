/**
 * GET — application/pdf receipt download
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPaymentById, getSubscriptionById } from "@/lib/dal/subscriptions";
import { buildInvoicePdfBuffer, invoicePdfFilename } from "@/lib/invoice-pdf";

export async function GET(
  _request: Request,
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

  try {
    const buffer = await buildInvoicePdfBuffer(payment, sub);
    const filename = invoicePdfFilename(payment);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[invoice pdf]", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
