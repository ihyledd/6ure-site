/**
 * GET  /api/user/subscription — Get user's subscriptions
 * POST /api/user/subscription — Cancel subscription
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, queryOne, execute } from "@/lib/db";
import { cancelSubscription as cancelPayPal } from "@/lib/paypal";
import { sendCancellationConfirmation } from "@/lib/send-subscription-email";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const subscriptions = await query(
    `SELECT id, plan_category, plan_interval, status, amount, currency, email, current_period_start, current_period_end, created_at, cancelled_at, cancel_reason FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
    [session.user.id]
  );
  const activeIds = subscriptions.filter((s: any) => s.status === "ACTIVE").map((s: any) => s.id);
  let payments: unknown[] = [];
  if (activeIds.length > 0) {
    const ph = activeIds.map(() => "?").join(",");
    payments = await query(`SELECT id, subscription_id, amount, status, created_at, refund_amount FROM payments WHERE subscription_id IN (${ph}) ORDER BY created_at DESC LIMIT 20`, activeIds);
  }
  return NextResponse.json({ subscriptions, payments });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Auth required" }, { status: 401 });

  const { action, subscriptionId, reason } = await request.json();

  const sub = await queryOne<{
    id: string; paypal_subscription_id: string | null; plan_category: string;
    plan_interval: string; status: string; email: string | null;
  }>(`SELECT id, paypal_subscription_id, plan_category, plan_interval, status, email FROM subscriptions WHERE id = ? AND user_id = ?`, [subscriptionId, session.user.id]);

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (sub.status !== "ACTIVE") return NextResponse.json({ error: "Not active" }, { status: 400 });

  if (action === "cancel") {
    if (sub.paypal_subscription_id && sub.plan_interval !== "LIFETIME") {
      try { await cancelPayPal(sub.paypal_subscription_id, reason || "Cancelled by user"); } catch (e) { console.error("[Cancel]", e); return NextResponse.json({ error: "Failed to cancel on PayPal" }, { status: 500 }); }
    }
    await execute(`UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ?, updated_at = NOW() WHERE id = ?`, [reason ?? null, sub.id]);
    if (sub.email) await sendCancellationConfirmation(sub.email, { planCategory: sub.plan_category, planInterval: sub.plan_interval });
    return NextResponse.json({ success: true, message: "Subscription cancelled" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
