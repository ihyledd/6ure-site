/**
 * POST /api/admin/payments/[id]/refund
 * Issue a refund via PayPal for a specific payment.
 * Developer-only.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { queryOne, execute } from "@/lib/db";
import { refundSale } from "@/lib/paypal";
import { sendRefundNotification } from "@/lib/send-subscription-email";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { amount, reason } = (await request.json()) as {
    amount?: number;  // optional: partial refund amount. omit for full refund
    reason?: string;
  };

  const payment = await queryOne<{
    id: string;
    subscription_id: string;
    paypal_sale_id: string | null;
    paypal_transaction_id: string | null;
    amount: string;
    status: string;
    payer_email: string | null;
    payer_name: string | null;
  }>(
    `SELECT * FROM payments WHERE id = ?`,
    [id]
  );

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status === "REFUNDED") {
    return NextResponse.json({ error: "Payment already refunded" }, { status: 400 });
  }

  const captureId = payment.paypal_sale_id ?? payment.paypal_transaction_id;
  if (!captureId) {
    return NextResponse.json({ error: "No PayPal capture ID found" }, { status: 400 });
  }

  try {
    // Issue refund on PayPal
    const refundResult = await refundSale(captureId, amount, reason);
    const refundAmount = amount ?? parseFloat(payment.amount);
    const isFullRefund = refundAmount >= parseFloat(payment.amount);

    // Update payment record
    await execute(
      `UPDATE payments
       SET status = ?,
           refund_amount = ?,
           refund_reason = ?,
           refunded_at = NOW(),
           refunded_by = ?
       WHERE id = ?`,
      [
        isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED",
        refundAmount,
        reason ?? null,
        session.user.id,
        payment.id,
      ]
    );

    // If full refund, also cancel the subscription
    if (isFullRefund) {
      await execute(
        `UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ?, updated_at = NOW() WHERE id = ?`,
        [reason ?? "Refunded by admin", payment.subscription_id]
      );
    }

    // Get subscription details for email
    const sub = await queryOne<{ plan_category: string; plan_interval: string }>(
      `SELECT plan_category, plan_interval FROM subscriptions WHERE id = ?`,
      [payment.subscription_id]
    );

    // Send refund notification email
    if (payment.payer_email && sub) {
      await sendRefundNotification(payment.payer_email, {
        planCategory: sub.plan_category,
        planInterval: sub.plan_interval,
        refundAmount: refundAmount.toFixed(2),
        originalAmount: payment.amount,
        reason,
        transactionId: captureId,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Refund of $${refundAmount.toFixed(2)} processed`,
      refundId: refundResult?.id,
    });
  } catch (err) {
    console.error("[Refund]", err);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
