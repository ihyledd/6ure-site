/**
 * POST /api/paypal/checkout-lifetime — Create a one-time PayPal order for lifetime plans.
 * Applies one-time migration discount for eligible users.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createOrder, getApprovalUrl, getLifetimePrice } from "@/lib/paypal";
import { getActiveSubscription, getMigrationEligibility } from "@/lib/dal/subscriptions";
import { getPlanPrice } from "@/lib/pricing";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

const BASE_URL = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://6ureleaks.com";

export async function POST(request: NextRequest) {
  // Rate limit: 3 per 5 minutes per IP
  const ip = getClientIp(request);
  const { success, reset } = sensitiveLimiter.check(ip);
  if (!success) return tooManyRequestsResponse(reset);

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { planCategory } = body as {
      planCategory: "PREMIUM" | "LEAK_PROTECTION";
    };

    if (!["PREMIUM", "LEAK_PROTECTION"].includes(planCategory)) {
      return NextResponse.json({ error: "Invalid plan category" }, { status: 400 });
    }

    const existing = await getActiveSubscription(session.user.id, planCategory);
    if (existing) {
      return NextResponse.json({ error: "You already have an active subscription for this plan" }, { status: 409 });
    }

    const planLabel = planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
    const username = (session.user as { username?: string }).username;
    const customId = `${session.user.id}:${planCategory}:LIFETIME`;

    let amount = getLifetimePrice(planCategory);
    let appliedDiscount = 0;
    const originalPrice = getPlanPrice(planCategory, "LIFETIME");

    // Lifetime: migration discount only — promo codes are monthly-only
    const migration = await getMigrationEligibility(session.user.id, planCategory);
    if (migration.eligible) {
      appliedDiscount = migration.discountPercent;
    }

    if (appliedDiscount > 0) {
      const discounted = originalPrice * (1 - appliedDiscount / 100);
      amount = Math.max(0.01, discounted).toFixed(2);
    }

    const order = await createOrder({
      amount,
      description: username
        ? `6ure ${planLabel} — Lifetime (@${username})`
        : `6ure ${planLabel} — Lifetime`,
      customId,
      returnUrl: `${BASE_URL}/api/paypal/callback?type=lifetime`,
      cancelUrl: `${BASE_URL}/membership?status=cancelled`,
    });

    const approvalUrl = getApprovalUrl(order.links);
    if (!approvalUrl) {
      return NextResponse.json({ error: "Failed to get PayPal approval URL" }, { status: 500 });
    }

    return NextResponse.json({
      approvalUrl,
      orderId: order.id,
      discountApplied: appliedDiscount > 0 ? appliedDiscount : undefined,
    });
  } catch (error) {
    console.error("[API] POST /api/paypal/checkout-lifetime:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
