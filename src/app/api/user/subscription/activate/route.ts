import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSubscriptionById, updateSubscription, logSubscriptionAction } from "@/lib/dal/subscriptions";
import { activateSubscription } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  let body: { subscriptionId?: string };
  try {
    body = (await request.json()) as { subscriptionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { subscriptionId } = body;
  if (!subscriptionId || typeof subscriptionId !== "string") {
    return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
  }

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub || sub.user_id !== session.user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (sub.status !== "SUSPENDED") {
    return NextResponse.json({ error: "Subscription is not suspended" }, { status: 400 });
  }

  if (!sub.paypal_subscription_id) {
    return NextResponse.json({ error: "Missing PayPal ID for subscription" }, { status: 400 });
  }

  try {
    await activateSubscription(sub.paypal_subscription_id);
    
    // Optimistically update status
    await updateSubscription(sub.id, { status: "ACTIVE" });

    await logSubscriptionAction({
      subscriptionId: sub.id,
      userId: session.user.id,
      action: "MANUAL_REACTIVATE",
      details: {},
    });

    return NextResponse.json({ ok: true, message: "Subscription reactivated successfully." });
  } catch (err: any) {
    console.error("[POST /api/user/subscription/activate]", err);
    return NextResponse.json(
      { error: "Failed to reactivate subscription with PayPal. Please check your payment method on PayPal.", details: err.message },
      { status: 500 }
    );
  }
}
