/**
 * POST /api/admin/subscriptions/[id]/cancel — Admin manually cancels a subscription.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionById, updateSubscription } from "@/lib/dal/subscriptions";
import { cancelSubscription } from "@/lib/paypal";
import { releaseDiscordRoleIfSubscriptionAccessEnded } from "@/lib/subscription-role-on-cancel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

  try {
    const body = await request.json();
    const { reason = "Cancelled by staff" } = body;

    const sub = await getSubscriptionById(id);
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    if (sub.status !== "ACTIVE" && sub.status !== "PENDING") {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
    }

    if (sub.plan_interval === "LIFETIME") {
      await updateSubscription(id, {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
        currentPeriodEnd: new Date(),
      });
      const fresh = await getSubscriptionById(id);
      if (fresh) await releaseDiscordRoleIfSubscriptionAccessEnded(fresh, new Date(0));
      return NextResponse.json({ success: true, message: "Lifetime subscription cancelled internally (no PayPal action)" });
    }

    // Cancel in PayPal
    if (sub.paypal_subscription_id) {
      await cancelSubscription(sub.paypal_subscription_id, reason);
    }

    await updateSubscription(sub.id, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelReason: reason,
      currentPeriodEnd: new Date(),
    });

    const updated = await getSubscriptionById(sub.id);
    if (updated) {
      await releaseDiscordRoleIfSubscriptionAccessEnded(updated, new Date(0));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] POST /api/admin/subscriptions/[id]/cancel:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
