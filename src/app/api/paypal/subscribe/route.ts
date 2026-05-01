/**
 * POST /api/paypal/subscribe — Create a recurring PayPal subscription.
 * Dynamically creates a PayPal product + billing plan + subscription per checkout.
 * Applies one-time migration discount for eligible users.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDynamicSubscription, getApprovalUrl } from "@/lib/paypal";
import { getActiveSubscription, getMigrationEligibility, validatePromoCode, incrementPromoUsage, recordPromoUsage } from "@/lib/dal/subscriptions";
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
    const { planCategory, planInterval, promoCode } = body as {
      planCategory: "PREMIUM" | "LEAK_PROTECTION";
      planInterval: "MONTHLY" | "YEARLY";
      promoCode?: string;
    };

    if (!["PREMIUM", "LEAK_PROTECTION"].includes(planCategory)) {
      return NextResponse.json({ error: "Invalid plan category" }, { status: 400 });
    }
    if (!["MONTHLY", "YEARLY"].includes(planInterval)) {
      return NextResponse.json({ error: "Invalid plan interval" }, { status: 400 });
    }

    const existing = await getActiveSubscription(session.user.id, planCategory);
    if (existing) {
      return NextResponse.json({ error: "You already have an active subscription for this plan" }, { status: 409 });
    }

    const customId = `${session.user.id}:${planCategory}:${planInterval}`;
    const username = (session.user as { username?: string }).username || undefined;

    let overridePrice: string | undefined;
    let appliedDiscount = 0;
    let appliedPromoId: string | undefined;
    const originalPrice = getPlanPrice(planCategory, planInterval);

    // Prefer an explicit promo code when valid for this plan; otherwise Patreon migration discount.
    if (promoCode) {
      const promo = await validatePromoCode(promoCode, planCategory, session.user.id, planInterval);
      if (promo.valid && promo.discount) {
        appliedDiscount = promo.discount;
        appliedPromoId = promo.promoId;
      }
    }
    if (!appliedDiscount) {
      const migration = await getMigrationEligibility(session.user.id, planCategory);
      if (migration.eligible) {
        appliedDiscount = migration.discountPercent;
      }
    }

    if (appliedDiscount > 0) {
      const discounted = originalPrice * (1 - appliedDiscount / 100);
      overridePrice = Math.max(0.01, discounted).toFixed(2);
    }

    const paypalSub = await createDynamicSubscription({
      planCategory,
      planInterval,
      customId,
      returnUrl: `${BASE_URL}/api/paypal/callback?type=subscription`,
      cancelUrl: `${BASE_URL}/membership?status=cancelled`,
      username,
      overridePrice,
    });

    const approvalUrl = getApprovalUrl(paypalSub.links);
    if (!approvalUrl) {
      return NextResponse.json({ error: "Failed to get PayPal approval URL" }, { status: 500 });
    }

    if (appliedPromoId) {
      await incrementPromoUsage(appliedPromoId);
      await recordPromoUsage(appliedPromoId, session.user.id);
    }

    return NextResponse.json({
      approvalUrl,
      paypalSubscriptionId: paypalSub.id,
      discountApplied: appliedDiscount > 0 ? appliedDiscount : undefined,
    });
  } catch (error) {
    console.error("[API] POST /api/paypal/subscribe:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
