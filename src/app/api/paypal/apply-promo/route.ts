/**
 * POST /api/paypal/apply-promo — Validate a promo code
 */
import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function POST(request: Request) {
  const { code, planCategory } = await request.json();
  if (!code) return NextResponse.json({ valid: false, error: "Code is required" });

  const promo = await queryOne<{
    id: string; code: string; discount_percent: number; max_uses: number | null;
    used_count: number; valid_from: Date | null; valid_until: Date | null;
    plan_category: string | null; active: boolean;
  }>(
    `SELECT id, code, discount_percent, max_uses, used_count, valid_from, valid_until, plan_category, active FROM promo_codes WHERE code = ? AND active = 1`,
    [code.toUpperCase()]
  );

  if (!promo) return NextResponse.json({ valid: false, error: "Invalid promo code" });
  if (promo.max_uses && promo.used_count >= promo.max_uses) return NextResponse.json({ valid: false, error: "Code fully redeemed" });
  if (promo.valid_from && new Date() < new Date(promo.valid_from)) return NextResponse.json({ valid: false, error: "Code not yet active" });
  if (promo.valid_until && new Date() > new Date(promo.valid_until)) return NextResponse.json({ valid: false, error: "Code expired" });
  if (promo.plan_category && promo.plan_category !== planCategory) return NextResponse.json({ valid: false, error: "Code not valid for this plan" });

  return NextResponse.json({ valid: true, discountPercent: promo.discount_percent, code: promo.code });
}
