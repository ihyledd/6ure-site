/**
 * POST /api/admin/payments/[id]/refund — Admin manually refunds a payment.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { queryOne } from "@/lib/db";
import { getSubscriptionById, updatePaymentRefund, type PaymentRow } from "@/lib/dal/subscriptions";
import { refundPayment } from "@/lib/paypal";
import { sendRefundNotification } from "@/lib/send-subscription-email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const { id } = await params; // payment id
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const body = await request.json();
    const { amount, reason = "Refunded by admin" } = body as { amount?: number; reason?: string };

    const payment = await queryOne<PaymentRow>("SELECT * FROM payments WHERE id = ?", [id]);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    if (payment.status === "REFUNDED") {
      return NextResponse.json({ error: "Payment already refunded" }, { status: 400 });
    }

    if (!payment.paypal_sale_id) {
      return NextResponse.json({ error: "No PayPal sale ID available for this payment" }, { status: 400 });
    }

    // Process refund in PayPal
    const rf = await refundPayment(payment.paypal_sale_id, amount ? String(amount) : undefined);
    
    // Will throw error if it fails. If success:
    const refundAmountNum = amount || parseFloat(payment.amount);

    await updatePaymentRefund(id, {
      refundAmount: refundAmountNum,
      refundReason: reason,
      refundedBy: session.user.id,
    });

    const sub = await getSubscriptionById(payment.subscription_id);

    // Send refund email
    if (payment.payer_email && sub) {
      const planName = sub.plan_category === "PREMIUM" ? "Premium" : "Leak Protection";
      await sendRefundNotification(payment.payer_email, planName, String(refundAmountNum));
    }

    return NextResponse.json({ success: true, refundId: rf.id });
  } catch (error) {
    console.error("[API] POST /api/admin/payments/[id]/refund:", error);
    return NextResponse.json({ error: "Failed to refund payment" }, { status: 500 });
  }
}
