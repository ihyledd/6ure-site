/**
 * GET  /api/user/subscription — Get current user's subscriptions
 * POST /api/user/subscription — Cancel user's subscription
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, queryOne, execute } from "@/lib/db";
import { cancelSubscription as cancelPayPalSubscription } from "@/lib/paypal";
import { sendCancellationConfirmation } from "@/lib/send-subscription-email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const subscriptions = await query<{
    id: string;
    plan_category: string;
    plan_interval: string;
    status: string;
    amount: string;
    currency: string;
    email: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    created_at: string;
    cancelled_at: string | null;
    cancel_reason: string | null;
  }>(
    `SELECT id, plan_category, plan_interval, status, amount, currency, email,
            current_period_start, current_period_end, created_at, cancelled_at, cancel_reason
     FROM subscriptions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [session.user.id]
  );

  // Get payment history for active subscriptions
  const activeSubIds = subscriptions
    .filter((s) => s.status === "ACTIVE")
    .map((s) => s.id);

  let payments: Array<{
    id: string;
    subscription_id: string;
    amount: string;
    status: string;
    created_at: string;
    refund_amount: string | null;
  }> = [];

  if (activeSubIds.length > 0) {
    const placeholders = activeSubIds.map(() => "?").join(",");
    payments = await query(
      `SELECT id, subscription_id, amount, status, created_at, refund_amount
       FROM payments
       WHERE subscription_id IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT 20`,
      activeSubIds
    );
  }

  return NextResponse.json({ subscriptions, payments });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { action, subscriptionId, reason, newInterval } = (await request.json()) as {
    action: "cancel" | "change_plan";
    subscriptionId: string;
    reason?: string;
    newInterval?: string;
  };

  // Verify ownership
  const sub = await queryOne<{
    id: string;
    paypal_subscription_id: string | null;
    plan_category: string;
    plan_interval: string;
    status: string;
    email: string | null;
  }>(
    `SELECT id, paypal_subscription_id, plan_category, plan_interval, status, email
     FROM subscriptions WHERE id = ? AND user_id = ?`,
    [subscriptionId, session.user.id]
  );

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (sub.status !== "ACTIVE") {
    return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
  }

  switch (action) {
    case "cancel": {
      // Cancel on PayPal (only for recurring, not lifetime)
      if (sub.paypal_subscription_id && sub.plan_interval !== "LIFETIME") {
        try {
          await cancelPayPalSubscription(
            sub.paypal_subscription_id,
            reason || "Cancelled by user"
          );
        } catch (err) {
          console.error("[Cancel] PayPal error:", err);
          return NextResponse.json({ error: "Failed to cancel on PayPal" }, { status: 500 });
        }
      }

      await execute(
        `UPDATE subscriptions
         SET status = 'CANCELLED',
             cancelled_at = NOW(),
             cancel_reason = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [reason ?? null, sub.id]
      );

      // Send email
      if (sub.email) {
        await sendCancellationConfirmation(sub.email, {
          planCategory: sub.plan_category,
          planInterval: sub.plan_interval,
        });
      }

      return NextResponse.json({ success: true, message: "Subscription cancelled" });
    }

    case "change_plan": {
      if (!newInterval || !["MONTHLY", "YEARLY"].includes(newInterval)) {
        return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
      }
      if (sub.plan_interval === "LIFETIME") {
        return NextResponse.json({ error: "Cannot change a lifetime subscription" }, { status: 400 });
      }
      if (sub.plan_interval === newInterval) {
        return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
      }

      // For plan changes: cancel existing PayPal subscription, create new one
      // The user will need to go through checkout again for the new plan
      return NextResponse.json({
        success: true,
        action: "redirect",
        message: "To change your plan, please cancel your current subscription and subscribe to the new plan.",
      });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
