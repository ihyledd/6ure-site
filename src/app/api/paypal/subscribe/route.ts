/**
 * POST /api/paypal/subscribe
 * Creates a PayPal subscription (monthly/yearly) or one-time payment (lifetime).
 * Body: { planCategory, planInterval, promoCode? }
 * Requires authenticated user.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  createSubscription,
  createOrder,
  PLAN_CONFIG,
  getEffectivePrice,
} from "@/lib/paypal";
import { query, queryOne, execute } from "@/lib/db";

const SITE_URL = process.env.NEXTAUTH_URL ?? "https://6ureleaks.com";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await request.json();
  const { planCategory, planInterval, promoCode } = body as {
    planCategory: string;
    planInterval: string;
    promoCode?: string;
  };

  // Validate plan
  if (!["PREMIUM", "LEAK_PROTECTION"].includes(planCategory)) {
    return NextResponse.json({ error: "Invalid plan category" }, { status: 400 });
  }
  if (!["MONTHLY", "YEARLY", "LIFETIME"].includes(planInterval)) {
    return NextResponse.json({ error: "Invalid plan interval" }, { status: 400 });
  }

  const config =
    PLAN_CONFIG[planCategory as keyof typeof PLAN_CONFIG]?.[
      planInterval as keyof (typeof PLAN_CONFIG)["PREMIUM"]
    ];
  if (!config) {
    return NextResponse.json({ error: "Plan not found" }, { status: 400 });
  }

  // Check if user already has an active subscription for this category
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM subscriptions WHERE user_id = ? AND plan_category = ? AND status = 'ACTIVE'`,
    [session.user.id, planCategory]
  );
  if (existing) {
    return NextResponse.json(
      { error: "You already have an active subscription for this plan" },
      { status: 409 }
    );
  }

  // Validate promo code
  let promoPercent = 0;
  let promoId: string | null = null;
  if (promoCode) {
    const promo = await queryOne<{
      id: string;
      discount_percent: number;
      max_uses: number | null;
      used_count: number;
      valid_from: Date | null;
      valid_until: Date | null;
      plan_category: string | null;
      active: boolean;
    }>(
      `SELECT id, discount_percent, max_uses, used_count, valid_from, valid_until, plan_category, active FROM promo_codes WHERE code = ? AND active = 1`,
      [promoCode.toUpperCase()]
    );

    if (!promo) {
      return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json({ error: "Promo code has been fully redeemed" }, { status: 400 });
    }
    if (promo.valid_from && new Date() < new Date(promo.valid_from)) {
      return NextResponse.json({ error: "Promo code is not yet active" }, { status: 400 });
    }
    if (promo.valid_until && new Date() > new Date(promo.valid_until)) {
      return NextResponse.json({ error: "Promo code has expired" }, { status: 400 });
    }
    if (promo.plan_category && promo.plan_category !== planCategory) {
      return NextResponse.json({ error: "Promo code is not valid for this plan" }, { status: 400 });
    }

    promoPercent = promo.discount_percent;
    promoId = promo.id;
  }

  const { final: effectivePrice } = getEffectivePrice(
    planCategory as "PREMIUM" | "LEAK_PROTECTION",
    planInterval as "MONTHLY" | "YEARLY" | "LIFETIME",
    promoPercent
  );

  const userId = session.user.id;
  const planLabel = planCategory === "PREMIUM" ? "Premium" : "Leak Protection";
  const intervalLabel = planInterval.charAt(0) + planInterval.slice(1).toLowerCase();

  try {
    if (planInterval === "LIFETIME") {
      // One-time payment via PayPal Orders API
      const { orderId, approvalUrl } = await createOrder(
        effectivePrice,
        `${planLabel} Lifetime`,
        `${SITE_URL}/api/paypal/success?type=lifetime&category=${planCategory}`,
        `${SITE_URL}/membership?cancelled=true`,
        userId
      );

      // Create pending subscription
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await execute(
        `INSERT INTO subscriptions (id, user_id, paypal_order_id, plan_category, plan_interval, status, amount, currency, promo_code_id, discount_applied, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 'USD', ?, ?, NOW(), NOW())`,
        [subId, userId, orderId, planCategory, planInterval, effectivePrice, promoId, promoPercent > 0 ? (config.discountedPrice ?? config.price) - effectivePrice : null]
      );

      return NextResponse.json({ approvalUrl, orderId });
    } else {
      // Recurring subscription
      const paypalPlanId = config.paypalPlanId;
      if (!paypalPlanId) {
        return NextResponse.json(
          { error: "PayPal plan not configured for this interval" },
          { status: 500 }
        );
      }

      const { subscriptionId, approvalUrl } = await createSubscription(
        paypalPlanId,
        `${SITE_URL}/api/paypal/success?type=subscription&category=${planCategory}&interval=${planInterval}`,
        `${SITE_URL}/membership?cancelled=true`,
        userId
      );

      // Create pending subscription
      const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await execute(
        `INSERT INTO subscriptions (id, user_id, paypal_subscription_id, plan_category, plan_interval, status, amount, currency, promo_code_id, discount_applied, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?, 'USD', ?, ?, NOW(), NOW())`,
        [subId, userId, subscriptionId, planCategory, planInterval, effectivePrice, promoId, promoPercent > 0 ? (config.discountedPrice ?? config.price) - effectivePrice : null]
      );

      return NextResponse.json({ approvalUrl, subscriptionId });
    }
  } catch (err) {
    console.error("[PayPal Subscribe]", err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
