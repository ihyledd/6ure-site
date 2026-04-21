/**
 * POST /api/promo-codes/validate — Validate a promo code (authenticated users only).
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
      return NextResponse.json({ valid: false, error: "Please enter a promo code" }, { status: 400 });
    }

    const result = await validatePromoCode(code.trim(), planCategory, session.user.id, planInterval);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/promo-codes/validate:", error);
    return NextResponse.json({ valid: false, error: "Failed to validate promo code" }, { status: 500 });
  }
}
