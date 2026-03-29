/**
 * GET  /api/admin/subscriptions/[id] — Get subscription details
 * POST /api/admin/subscriptions/[id] — Admin actions (cancel, send instructions)
 * Developer-only.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { query, queryOne, execute } from "@/lib/db";
import { cancelSubscription as cancelPayPalSubscription } from "@/lib/paypal";
import {
  sendLeakProtectionInstructions,
  sendCancellationConfirmation,
} from "@/lib/send-subscription-email";

const DEV_ID = process.env.WIKI_DEVELOPER_DISCORD_ID ?? "";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const subscription = await queryOne(
    `SELECT s.*, u.username, u.global_name, u.display_name, u.avatar, u.guild_avatar, u.guild_nickname,
            pc.code as promo_code, pc.discount_percent as promo_discount
     FROM subscriptions s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN promo_codes pc ON pc.id = s.promo_code_id
     WHERE s.id = ?`,
    [id]
  );

  if (!subscription) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  const payments = await query(
    `SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC`,
    [id]
  );

  return NextResponse.json({ subscription, payments });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.id !== DEV_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, reason } = (await request.json()) as {
    action: "cancel" | "send_instructions";
    reason?: string;
  };

  const sub = await queryOne<{
    id: string;
    paypal_subscription_id: string | null;
    plan_category: string;
    plan_interval: string;
    status: string;
    email: string | null;
  }>(
    `SELECT id, paypal_subscription_id, plan_category, plan_interval, status, email FROM subscriptions WHERE id = ?`,
    [id]
  );

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  switch (action) {
    case "cancel": {
      if (sub.paypal_subscription_id && sub.plan_interval !== "LIFETIME") {
        try {
          await cancelPayPalSubscription(sub.paypal_subscription_id, reason || "Cancelled by admin");
        } catch (err) {
          console.error("[Admin Cancel]", err);
        }
      }

      await execute(
        `UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = NOW(), cancel_reason = ?, updated_at = NOW() WHERE id = ?`,
        [reason ?? "Cancelled by admin", sub.id]
      );

      if (sub.email) {
        await sendCancellationConfirmation(sub.email, {
          planCategory: sub.plan_category,
          planInterval: sub.plan_interval,
        });
      }

      return NextResponse.json({ success: true, message: "Subscription cancelled" });
    }

    case "send_instructions": {
      if (sub.plan_category !== "LEAK_PROTECTION") {
        return NextResponse.json({ error: "Instructions only for Leak Protection" }, { status: 400 });
      }
      if (!sub.email) {
        return NextResponse.json({ error: "No email on file" }, { status: 400 });
      }

      await sendLeakProtectionInstructions(sub.email, {
        planInterval: sub.plan_interval,
      });

      await execute(
        `UPDATE subscriptions SET instructions_sent_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [sub.id]
      );

      return NextResponse.json({ success: true, message: "Instructions sent" });
    }

    default:
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
}
