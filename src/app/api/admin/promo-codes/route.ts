/**
 * GET, POST /api/admin/promo-codes — List or create promo codes.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listPromoCodes, createPromoCode } from "@/lib/dal/subscriptions";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  try {
    const codes = await listPromoCodes();
    return NextResponse.json(codes);
  } catch (error) {
    console.error("[API] GET /api/admin/promo-codes:", error);
    return NextResponse.json({ error: "Failed to fetch promo codes" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = await createPromoCode(body);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("[API] POST /api/admin/promo-codes:", error);
    return NextResponse.json({ error: "Failed to create promo code" }, { status: 500 });
  }
}
