/**
 * POST /api/paypal/apply-promo — Validate a promo code and return discount.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { validatePromoCode } from "@/lib/dal/subscriptions";
import { sensitiveLimiter, getClientIp, tooManyRequestsResponse } from "@/lib/rate-limit";

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
    const { code, planCategory, planInterval } = body as {
      code: string;
      planCategory?: string;
      planInterval?: "MONTHLY" | "YEARLY" | "LIFETIME";
    };

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Promo code is required" }, { status: 400 });
    }

    const result = await validatePromoCode(code, planCategory, session.user.id, planInterval);
    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error });
    }

    return NextResponse.json({ valid: true, discount: result.discount });
  } catch (error) {
    console.error("[API] POST /api/paypal/apply-promo:", error);
    return NextResponse.json({ error: "Failed to validate promo code" }, { status: 500 });
  }
}
